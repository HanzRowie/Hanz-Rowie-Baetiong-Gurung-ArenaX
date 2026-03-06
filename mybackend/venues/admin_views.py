"""
Admin Venue Management API Views
Provides endpoints for venue approval workflow.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from .models import Venue, VenueAuditLog
from .admin_serializers import AdminVenueListSerializer, AdminVenueDetailSerializer
from .validation_services import VenueValidationService
from .throttles import AdminApprovalThrottle
from .reauthentication import require_reauthentication
from accounts.permissions import IsAdminUser


class AdminVenuePagination(PageNumberPagination):
    """
    Pagination for admin venue list.
    Supports page sizes of 25, 50, or 100 items.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminVenueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin API for venue management and approval workflow.
    
    Endpoints:
    - GET /api/admin/venues/ - List venues with filtering
    - GET /api/admin/venues/{id}/ - Get venue details
    - PATCH /api/admin/venues/{id}/approve/ - Approve venue
    - PATCH /api/admin/venues/{id}/reject/ - Reject venue
    - PATCH /api/admin/venues/{id}/conditional-approve/ - Request documents
    - POST /api/admin/venues/bulk-approve/ - Bulk approve
    - POST /api/admin/venues/bulk-reject/ - Bulk reject
    - GET /api/admin/venues/stats/ - Get statistics
    
    Requirements: 5.1, 5.2, 5.8
    """
    
    permission_classes = [IsAdminUser]
    serializer_class = AdminVenueListSerializer
    pagination_class = AdminVenuePagination
    
    def get_serializer_class(self):
        """
        Use different serializers for list and detail views.
        """
        if self.action == 'retrieve':
            return AdminVenueDetailSerializer
        return AdminVenueListSerializer
    
    def get_queryset(self):
        """
        Optimized queryset with filtering support.
        
        Filters:
        - sport_type: Filter by sport type (FUTSAL, BADMINTON)
        - status: Filter by approval_status (PENDING, APPROVED, REJECTED, CONDITIONAL_APPROVAL)
        - owner: Filter by owner ID
        - date_from: Filter venues created >= this value
        - date_to: Filter venues created <= this value
        - search: Search across name, owner name, and location fields
        
        Optimizations:
        - select_related for owner, approved_by to avoid N+1 queries
        - prefetch_related for audit_logs (used in detail view)
        
        Requirements: 5.1, 5.2, 5.8
        """
        queryset = Venue.objects.select_related(
            'owner',
            'approved_by'
        ).prefetch_related(
            'audit_logs'
        )
        
        # Filter by sport_type
        sport_type = self.request.query_params.get('sport_type')
        if sport_type:
            queryset = queryset.filter(sport_type=sport_type)
        
        # Filter by approval status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(approval_status=status_filter)
        
        # Filter by owner
        owner = self.request.query_params.get('owner')
        if owner:
            queryset = queryset.filter(owner_id=owner)
        
        # Filter by date range (using id as proxy for creation date)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(id__gte=date_from)
        if date_to:
            queryset = queryset.filter(id__lte=date_to)
        
        # Search by name, owner name, or location
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(owner__full_name__icontains=search) |
                Q(location__icontains=search)
            )
        
        return queryset.order_by('-id')
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve venue details with validation results.
        
        Runs automated validation checks and includes results in response.
        
        Requirements: 13.6
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Run validation checks
        validation_service = VenueValidationService(instance)
        validation_results = validation_service.validate_all()
        
        # Add validation results to response
        response_data = serializer.data
        response_data['validation_results'] = validation_results
        
        return Response(response_data)
    
    @action(detail=True, methods=['patch'], url_path='approve', throttle_classes=[AdminApprovalThrottle])
    def approve(self, request, pk=None):
        """
        Approve a venue.
        
        Validates that the venue is in PENDING or CONDITIONAL_APPROVAL status,
        updates approval_status to APPROVED, sets approval_date and approved_by fields,
        creates a VenueAuditLog entry, and returns updated venue data.
        
        Request Body:
        - approval_notes (optional): Notes from admin during approval
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 2.3, 2.6, 5.3, 19.1, 19.5
        """
        venue = self.get_object()
        
        # Validate current status
        if venue.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
            return Response(
                {
                    'error': f'Cannot approve venue with status {venue.approval_status}. '
                             'Only PENDING or CONDITIONAL_APPROVAL venues can be approved.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store previous status for audit log
        previous_status = venue.approval_status
        
        # Get approval notes from request
        approval_notes = request.data.get('approval_notes', '')
        
        # Update venue approval fields
        venue.approval_status = 'APPROVED'
        venue.approval_date = timezone.now()
        venue.approved_by = request.user
        venue.approval_notes = approval_notes
        venue.save()
        
        # Create audit log entry
        VenueAuditLog.objects.create(
            administrator=request.user,
            action_type='APPROVE',
            venue=venue,
            previous_status=previous_status,
            new_status='APPROVED',
            reason=approval_notes,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        # Send notification to venue owner
        from tournaments.notification_utils import send_venue_approved_notification
        send_venue_approved_notification(venue, request.user)
        
        # Serialize and return updated venue
        serializer = AdminVenueDetailSerializer(venue)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='reject', throttle_classes=[AdminApprovalThrottle])
    def reject(self, request, pk=None):
        """
        Reject a venue.
        
        Validates that the venue is in PENDING or CONDITIONAL_APPROVAL status,
        updates approval_status to REJECTED, sets approval_date and approved_by fields,
        creates a VenueAuditLog entry, and returns updated venue data.
        
        Request Body:
        - rejection_reason (required): Explanation for rejection
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 2.4, 2.6, 5.4, 19.1, 19.5
        """
        venue = self.get_object()
        
        # Validate current status
        if venue.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
            return Response(
                {
                    'error': f'Cannot reject venue with status {venue.approval_status}. '
                             'Only PENDING or CONDITIONAL_APPROVAL venues can be rejected.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate rejection_reason is provided
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {'error': 'rejection_reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store previous status for audit log
        previous_status = venue.approval_status
        
        # Update venue approval fields
        venue.approval_status = 'REJECTED'
        venue.approval_date = timezone.now()
        venue.approved_by = request.user
        venue.rejection_reason = rejection_reason
        venue.save()
        
        # Create audit log entry
        VenueAuditLog.objects.create(
            administrator=request.user,
            action_type='REJECT',
            venue=venue,
            previous_status=previous_status,
            new_status='REJECTED',
            reason=rejection_reason,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        # Send notification to venue owner
        from tournaments.notification_utils import send_venue_rejected_notification
        send_venue_rejected_notification(venue, request.user, rejection_reason)
        
        # Serialize and return updated venue
        serializer = AdminVenueDetailSerializer(venue)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-approve', throttle_classes=[AdminApprovalThrottle])
    @require_reauthentication
    def bulk_approve(self, request):
        """
        Bulk approve multiple venues.
        
        Accepts an array of venue_ids (max 50 items), updates all venues
        to APPROVED status, creates VenueAuditLog entries for each venue,
        and returns success and failure counts with detailed error messages.
        
        Request Body:
        - venue_ids (required): Array of venue IDs to approve (max 50)
        - approval_notes (optional): Notes to apply to all approved venues
        
        Response Format:
        {
            "success_count": 5,
            "failure_count": 2,
            "total_count": 7,
            "failures": [
                {
                    "venue_id": 123,
                    "error": "Cannot approve venue with status APPROVED"
                }
            ]
        }
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 5.5, 11.2, 19.1, 19.2, 19.5
        """
        from django.db import transaction
        
        # Validate request data
        venue_ids = request.data.get('venue_ids', [])
        
        if not isinstance(venue_ids, list):
            return Response(
                {'error': 'venue_ids must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(venue_ids) == 0:
            return Response(
                {'error': 'venue_ids array cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(venue_ids) > 50:
            return Response(
                {'error': 'Cannot approve more than 50 venues at once'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approval_notes = request.data.get('approval_notes', '')
        
        # Track results
        success_count = 0
        failure_count = 0
        failures = []
        approved_venue_ids = []
        
        # Process each venue
        for venue_id in venue_ids:
            try:
                with transaction.atomic():
                    # Get venue with select_for_update to prevent race conditions
                    venue = Venue.objects.select_for_update().get(id=venue_id)
                    
                    # Validate current status
                    if venue.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
                        failures.append({
                            'venue_id': venue_id,
                            'error': f'Cannot approve venue with status {venue.approval_status}'
                        })
                        failure_count += 1
                        continue
                    
                    # Store previous status for audit log
                    previous_status = venue.approval_status
                    
                    # Update venue approval fields
                    venue.approval_status = 'APPROVED'
                    venue.approval_date = timezone.now()
                    venue.approved_by = request.user
                    venue.approval_notes = approval_notes
                    venue.save()
                    
                    # Create audit log entry
                    VenueAuditLog.objects.create(
                        administrator=request.user,
                        action_type='BULK_APPROVE',
                        venue=venue,
                        previous_status=previous_status,
                        new_status='APPROVED',
                        reason=approval_notes,
                        metadata={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'bulk_operation': True,
                            'total_items': len(venue_ids),
                        }
                    )
                    
                    approved_venue_ids.append(venue_id)
                    success_count += 1
                    
            except Venue.DoesNotExist:
                failures.append({
                    'venue_id': venue_id,
                    'error': 'Venue not found'
                })
                failure_count += 1
            except Exception as e:
                failures.append({
                    'venue_id': venue_id,
                    'error': str(e)
                })
                failure_count += 1
        
        # Send notifications to all successfully approved venues
        from tournaments.notification_utils import send_venue_approved_notification
        for venue_id in approved_venue_ids:
            try:
                venue = Venue.objects.get(id=venue_id)
                send_venue_approved_notification(venue, request.user)
            except Exception as e:
                # Log error but don't fail the bulk operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send notification for venue {venue_id}: {str(e)}")
        
        # Build response
        response_data = {
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': len(venue_ids),
            'approved_venue_ids': approved_venue_ids,
        }
        
        if failures:
            response_data['failures'] = failures
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-reject', throttle_classes=[AdminApprovalThrottle])
    @require_reauthentication
    def bulk_reject(self, request):
        """
        Bulk reject multiple venues.
        
        Accepts an array of venue_ids (max 50 items) and a rejection_reason,
        updates all venues to REJECTED status, creates VenueAuditLog entries
        for each venue, and returns success and failure counts with detailed error messages.
        
        Request Body:
        - venue_ids (required): Array of venue IDs to reject (max 50)
        - rejection_reason (required): Reason for rejection to apply to all venues
        
        Response Format:
        {
            "success_count": 5,
            "failure_count": 2,
            "total_count": 7,
            "failures": [
                {
                    "venue_id": 123,
                    "error": "Cannot reject venue with status REJECTED"
                }
            ]
        }
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 5.6, 11.3, 19.1, 19.2, 19.5
        """
        from django.db import transaction
        
        # Validate request data
        venue_ids = request.data.get('venue_ids', [])
        rejection_reason = request.data.get('rejection_reason', '').strip()
        
        if not isinstance(venue_ids, list):
            return Response(
                {'error': 'venue_ids must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(venue_ids) == 0:
            return Response(
                {'error': 'venue_ids array cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(venue_ids) > 50:
            return Response(
                {'error': 'Cannot reject more than 50 venues at once'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not rejection_reason:
            return Response(
                {'error': 'rejection_reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Track results
        success_count = 0
        failure_count = 0
        failures = []
        rejected_venue_ids = []
        
        # Process each venue
        for venue_id in venue_ids:
            try:
                with transaction.atomic():
                    # Get venue with select_for_update to prevent race conditions
                    venue = Venue.objects.select_for_update().get(id=venue_id)
                    
                    # Validate current status
                    if venue.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
                        failures.append({
                            'venue_id': venue_id,
                            'error': f'Cannot reject venue with status {venue.approval_status}'
                        })
                        failure_count += 1
                        continue
                    
                    # Store previous status for audit log
                    previous_status = venue.approval_status
                    
                    # Update venue approval fields
                    venue.approval_status = 'REJECTED'
                    venue.approval_date = timezone.now()
                    venue.approved_by = request.user
                    venue.rejection_reason = rejection_reason
                    venue.save()
                    
                    # Create audit log entry
                    VenueAuditLog.objects.create(
                        administrator=request.user,
                        action_type='BULK_REJECT',
                        venue=venue,
                        previous_status=previous_status,
                        new_status='REJECTED',
                        reason=rejection_reason,
                        metadata={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'bulk_operation': True,
                            'total_items': len(venue_ids),
                        }
                    )
                    
                    rejected_venue_ids.append(venue_id)
                    success_count += 1
                    
            except Venue.DoesNotExist:
                failures.append({
                    'venue_id': venue_id,
                    'error': 'Venue not found'
                })
                failure_count += 1
            except Exception as e:
                failures.append({
                    'venue_id': venue_id,
                    'error': str(e)
                })
                failure_count += 1
        
        # Send notifications to all successfully rejected venues
        from tournaments.notification_utils import send_venue_rejected_notification
        for venue_id in rejected_venue_ids:
            try:
                venue = Venue.objects.get(id=venue_id)
                send_venue_rejected_notification(venue, request.user, rejection_reason)
            except Exception as e:
                # Log error but don't fail the bulk operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send notification for venue {venue_id}: {str(e)}")
        
        # Build response
        response_data = {
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': len(venue_ids),
            'rejected_venue_ids': rejected_venue_ids,
        }
        
        if failures:
            response_data['failures'] = failures
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='conditional-approve', throttle_classes=[AdminApprovalThrottle])
    def conditional_approve(self, request, pk=None):
        """
        Set venue to conditional approval status and request additional documents.
        
        Validates that the venue is in PENDING status, updates approval_status to
        CONDITIONAL_APPROVAL, stores the list of requested_documents in JSONField,
        creates a VenueAuditLog entry, sends notification to owner, and
        returns updated venue data.
        
        Request Body:
        - requested_documents (required): Array of document names/types to request
        - notes (optional): Additional notes explaining what documents are needed
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 14.1, 14.2, 14.6, 19.1, 19.5
        """
        venue = self.get_object()
        
        # Validate current status
        if venue.approval_status not in ['PENDING']:
            return Response(
                {
                    'error': f'Cannot conditionally approve venue with status {venue.approval_status}. '
                             'Only PENDING venues can be conditionally approved.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate requested_documents is provided and is a list
        requested_documents = request.data.get('requested_documents', [])
        if not isinstance(requested_documents, list):
            return Response(
                {'error': 'requested_documents must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(requested_documents) == 0:
            return Response(
                {'error': 'requested_documents array cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional notes
        notes = request.data.get('notes', '')
        
        # Store previous status for audit log
        previous_status = venue.approval_status
        
        # Update venue approval fields
        venue.approval_status = 'CONDITIONAL_APPROVAL'
        venue.approval_date = timezone.now()
        venue.approved_by = request.user
        venue.requested_documents = requested_documents
        venue.approval_notes = notes
        venue.save()
        
        # Create audit log entry
        VenueAuditLog.objects.create(
            administrator=request.user,
            action_type='CONDITIONAL_APPROVE',
            venue=venue,
            previous_status=previous_status,
            new_status='CONDITIONAL_APPROVAL',
            reason=f"Requested documents: {', '.join(requested_documents)}. {notes}",
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'requested_documents': requested_documents,
            }
        )
        
        # Send notification to venue owner
        from tournaments.notification_utils import send_documents_requested_notification
        send_documents_requested_notification(
            resource=venue,
            resource_type='venue',
            admin_user=request.user,
            requested_documents=requested_documents
        )
        
        # Serialize and return updated venue
        serializer = AdminVenueDetailSerializer(venue)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get venue statistics with 60-second caching.
        
        Returns overall counts of venues by approval status and
        detailed breakdown by sport_type.
        
        Response Format:
        {
            "total_pending": 5,
            "total_approved": 20,
            "total_rejected": 3,
            "total_conditional_approval": 2,
            "by_sport_type": {
                "FUTSAL": {
                    "pending": 3,
                    "approved": 12,
                    "rejected": 2,
                    "conditional_approval": 1
                },
                "BADMINTON": {
                    "pending": 2,
                    "approved": 8,
                    "rejected": 1,
                    "conditional_approval": 1
                }
            }
        }
        
        Requirements: 5.7, 20.5
        """
        # Try to get cached stats
        cache_key = 'admin_venue_stats'
        cached_stats = cache.get(cache_key)
        
        if cached_stats is not None:
            return Response(cached_stats, status=status.HTTP_200_OK)
        
        # Calculate overall counts
        total_pending = Venue.objects.filter(approval_status='PENDING').count()
        total_approved = Venue.objects.filter(approval_status='APPROVED').count()
        total_rejected = Venue.objects.filter(approval_status='REJECTED').count()
        total_conditional_approval = Venue.objects.filter(
            approval_status='CONDITIONAL_APPROVAL'
        ).count()
        
        # Calculate counts by sport_type
        by_sport_type = {}
        
        # Get all sport types from the model
        sport_types = ['FUTSAL', 'BADMINTON']
        
        for sport in sport_types:
            by_sport_type[sport] = {
                'pending': Venue.objects.filter(
                    sport_type=sport,
                    approval_status='PENDING'
                ).count(),
                'approved': Venue.objects.filter(
                    sport_type=sport,
                    approval_status='APPROVED'
                ).count(),
                'rejected': Venue.objects.filter(
                    sport_type=sport,
                    approval_status='REJECTED'
                ).count(),
                'conditional_approval': Venue.objects.filter(
                    sport_type=sport,
                    approval_status='CONDITIONAL_APPROVAL'
                ).count(),
            }
        
        # Build response
        stats_data = {
            'total_pending': total_pending,
            'total_approved': total_approved,
            'total_rejected': total_rejected,
            'total_conditional_approval': total_conditional_approval,
            'by_sport_type': by_sport_type,
        }
        
        # Cache for 60 seconds
        cache.set(cache_key, stats_data, 60)
        
        return Response(stats_data, status=status.HTTP_200_OK)
