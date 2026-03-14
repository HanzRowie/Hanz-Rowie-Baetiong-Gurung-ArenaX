"""
Admin Tournament Management API Views
Provides endpoints for tournament approval workflow.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from .models import Tournament, TournamentAuditLog
from .admin_serializers import AdminTournamentListSerializer, AdminTournamentDetailSerializer
from .validation_services import TournamentValidationService
from .throttles import AdminApprovalThrottle
from .reauthentication import require_reauthentication
from accounts.permissions import IsAdminUser


class AdminTournamentPagination(PageNumberPagination):
    """
    Pagination for admin tournament list.
    Supports page sizes of 25, 50, or 100 items.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminTournamentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin API for tournament management and approval workflow.
    
    Endpoints:
    - GET /api/admin/tournaments/ - List tournaments with filtering
    - GET /api/admin/tournaments/{id}/ - Get tournament details
    - PATCH /api/admin/tournaments/{id}/approve/ - Approve tournament
    - PATCH /api/admin/tournaments/{id}/reject/ - Reject tournament
    - PATCH /api/admin/tournaments/{id}/conditional-approve/ - Request documents
    - POST /api/admin/tournaments/bulk-approve/ - Bulk approve
    - POST /api/admin/tournaments/bulk-reject/ - Bulk reject
    - GET /api/admin/tournaments/stats/ - Get statistics
    
    Requirements: 4.1, 4.2, 4.8
    """
    
    permission_classes = [IsAdminUser]
    serializer_class = AdminTournamentListSerializer
    pagination_class = AdminTournamentPagination
    
    def get_serializer_class(self):
        """
        Use different serializers for list and detail views.
        """
        if self.action == 'retrieve':
            return AdminTournamentDetailSerializer
        return AdminTournamentListSerializer
    
    def get_queryset(self):
        """
        Optimized queryset with filtering support.
        
        Filters:
        - sport_type: Filter by sport type (FUTSAL, BADMINTON)
        - status: Filter by approval_status (PENDING, APPROVED, REJECTED, CONDITIONAL_APPROVAL)
        - organizer: Filter by organizer ID
        - date_from: Filter tournaments with date >= this value
        - date_to: Filter tournaments with date <= this value
        - search: Search across title, organizer name, and venue fields
        
        Optimizations:
        - select_related for organizer, approved_by, linked_venue to avoid N+1 queries
        - prefetch_related for audit_logs (used in detail view)
        
        Requirements: 4.1, 4.2
        """
        queryset = Tournament.objects.select_related(
            'organizer',
            'approved_by',
            'linked_venue'
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
        
        # Filter by organizer
        organizer = self.request.query_params.get('organizer')
        if organizer:
            queryset = queryset.filter(organizer_id=organizer)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        # Search by title, organizer name, or venue
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(organizer__full_name__icontains=search) |
                Q(venue__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve tournament details with validation results.
        
        Runs automated validation checks and includes results in response.
        
        Requirements: 12.6
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Run validation checks
        validation_service = TournamentValidationService(instance)
        validation_results = validation_service.validate_all()
        
        # Add validation results to response
        response_data = serializer.data
        response_data['validation_results'] = validation_results
        
        return Response(response_data)
    
    @action(detail=True, methods=['patch'], url_path='approve', throttle_classes=[AdminApprovalThrottle])
    def approve(self, request, pk=None):
        """
        Approve a tournament.
        
        Validates that the tournament is in PENDING or CONDITIONAL_APPROVAL status,
        updates approval_status to APPROVED, sets approval_date and approved_by fields,
        creates a TournamentAuditLog entry, and returns updated tournament data.
        
        Request Body:
        - approval_notes (optional): Notes from admin during approval
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 1.3, 1.6, 4.3, 19.1, 19.5
        """
        tournament = self.get_object()
        
        # Validate current status
        if tournament.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
            return Response(
                {
                    'error': f'Cannot approve tournament with status {tournament.approval_status}. '
                             'Only PENDING or CONDITIONAL_APPROVAL tournaments can be approved.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Store previous status for audit log
        previous_status = tournament.approval_status
        
        # Get approval notes from request
        approval_notes = request.data.get('approval_notes', '')
        
        # Update tournament approval fields
        tournament.approval_status = 'APPROVED'
        tournament.approval_date = timezone.now()
        tournament.approved_by = request.user
        tournament.approval_notes = approval_notes
        tournament.save()
        
        # Create audit log entry
        TournamentAuditLog.objects.create(
            administrator=request.user,
            action_type='APPROVE',
            tournament=tournament,
            previous_status=previous_status,
            new_status='APPROVED',
            reason=approval_notes,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        # Send notification to organizer
        from .notification_utils import send_tournament_approved_notification
        send_tournament_approved_notification(tournament, request.user)
        
        # Serialize and return updated tournament
        serializer = AdminTournamentDetailSerializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='reject', throttle_classes=[AdminApprovalThrottle])
    def reject(self, request, pk=None):
        """
        Reject a tournament.
        
        Validates that the tournament is in PENDING or CONDITIONAL_APPROVAL status,
        updates approval_status to REJECTED, sets approval_date and approved_by fields,
        creates a TournamentAuditLog entry, and returns updated tournament data.
        
        Request Body:
        - rejection_reason (required): Explanation for rejection
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 1.4, 1.6, 4.4, 19.1, 19.5
        """
        tournament = self.get_object()
        
        # Validate current status
        if tournament.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
            return Response(
                {
                    'error': f'Cannot reject tournament with status {tournament.approval_status}. '
                             'Only PENDING or CONDITIONAL_APPROVAL tournaments can be rejected.'
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
        previous_status = tournament.approval_status
        
        # Update tournament approval fields
        tournament.approval_status = 'REJECTED'
        tournament.approval_date = timezone.now()
        tournament.approved_by = request.user
        tournament.rejection_reason = rejection_reason
        tournament.save()
        
        # Create audit log entry
        TournamentAuditLog.objects.create(
            administrator=request.user,
            action_type='REJECT',
            tournament=tournament,
            previous_status=previous_status,
            new_status='REJECTED',
            reason=rejection_reason,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        # Send notification to organizer
        from .notification_utils import send_tournament_rejected_notification
        send_tournament_rejected_notification(tournament, request.user, rejection_reason)
        
        # Serialize and return updated tournament
        serializer = AdminTournamentDetailSerializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-approve', throttle_classes=[AdminApprovalThrottle])
    @require_reauthentication
    def bulk_approve(self, request):
        """
        Bulk approve multiple tournaments.
        
        Accepts an array of tournament_ids (max 50 items), updates all tournaments
        to APPROVED status, creates TournamentAuditLog entries for each tournament,
        and returns success and failure counts with detailed error messages.
        
        Request Body:
        - tournament_ids (required): Array of tournament IDs to approve (max 50)
        - approval_notes (optional): Notes to apply to all approved tournaments
        
        Response Format:
        {
            "success_count": 5,
            "failure_count": 2,
            "total_count": 7,
            "failures": [
                {
                    "tournament_id": 123,
                    "error": "Cannot approve tournament with status APPROVED"
                }
            ]
        }
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 4.5, 11.2, 19.1, 19.2, 19.5
        """
        from django.db import transaction
        
        # Validate request data
        tournament_ids = request.data.get('tournament_ids', [])
        
        if not isinstance(tournament_ids, list):
            return Response(
                {'error': 'tournament_ids must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(tournament_ids) == 0:
            return Response(
                {'error': 'tournament_ids array cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(tournament_ids) > 50:
            return Response(
                {'error': 'Cannot approve more than 50 tournaments at once'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approval_notes = request.data.get('approval_notes', '')
        
        # Track results
        success_count = 0
        failure_count = 0
        failures = []
        approved_tournament_ids = []
        
        # Process each tournament
        for tournament_id in tournament_ids:
            try:
                with transaction.atomic():
                    # Get tournament with select_for_update to prevent race conditions
                    tournament = Tournament.objects.select_for_update().get(id=tournament_id)
                    
                    # Validate current status
                    if tournament.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
                        failures.append({
                            'tournament_id': tournament_id,
                            'error': f'Cannot approve tournament with status {tournament.approval_status}'
                        })
                        failure_count += 1
                        continue
                    
                    # Store previous status for audit log
                    previous_status = tournament.approval_status
                    
                    # Update tournament approval fields
                    tournament.approval_status = 'APPROVED'
                    tournament.approval_date = timezone.now()
                    tournament.approved_by = request.user
                    tournament.approval_notes = approval_notes
                    tournament.save()
                    
                    # Create audit log entry
                    TournamentAuditLog.objects.create(
                        administrator=request.user,
                        action_type='BULK_APPROVE',
                        tournament=tournament,
                        previous_status=previous_status,
                        new_status='APPROVED',
                        reason=approval_notes,
                        metadata={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'bulk_operation': True,
                            'total_items': len(tournament_ids),
                        }
                    )
                    
                    approved_tournament_ids.append(tournament_id)
                    success_count += 1
                    
            except Tournament.DoesNotExist:
                failures.append({
                    'tournament_id': tournament_id,
                    'error': 'Tournament not found'
                })
                failure_count += 1
            except Exception as e:
                failures.append({
                    'tournament_id': tournament_id,
                    'error': str(e)
                })
                failure_count += 1
        
        # Send notifications to all successfully approved tournaments
        from .notification_utils import send_tournament_approved_notification
        for tournament_id in approved_tournament_ids:
            try:
                tournament = Tournament.objects.get(id=tournament_id)
                send_tournament_approved_notification(tournament, request.user)
            except Exception as e:
                # Log error but don't fail the bulk operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send notification for tournament {tournament_id}: {str(e)}")
        
        # Build response
        response_data = {
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': len(tournament_ids),
            'approved_tournament_ids': approved_tournament_ids,
        }
        
        if failures:
            response_data['failures'] = failures
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-reject', throttle_classes=[AdminApprovalThrottle])
    @require_reauthentication
    def bulk_reject(self, request):
        """
        Bulk reject multiple tournaments.
        
        Accepts an array of tournament_ids (max 50 items) and a rejection_reason,
        updates all tournaments to REJECTED status, creates TournamentAuditLog entries
        for each tournament, and returns success and failure counts with detailed error messages.
        
        Request Body:
        - tournament_ids (required): Array of tournament IDs to reject (max 50)
        - rejection_reason (required): Reason for rejection to apply to all tournaments
        
        Response Format:
        {
            "success_count": 5,
            "failure_count": 2,
            "total_count": 7,
            "failures": [
                {
                    "tournament_id": 123,
                    "error": "Cannot reject tournament with status REJECTED"
                }
            ]
        }
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 4.6, 11.3, 19.1, 19.2, 19.5
        """
        from django.db import transaction
        
        # Validate request data
        tournament_ids = request.data.get('tournament_ids', [])
        rejection_reason = request.data.get('rejection_reason', '').strip()
        
        if not isinstance(tournament_ids, list):
            return Response(
                {'error': 'tournament_ids must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(tournament_ids) == 0:
            return Response(
                {'error': 'tournament_ids array cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(tournament_ids) > 50:
            return Response(
                {'error': 'Cannot reject more than 50 tournaments at once'},
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
        rejected_tournament_ids = []
        
        # Process each tournament
        for tournament_id in tournament_ids:
            try:
                with transaction.atomic():
                    # Get tournament with select_for_update to prevent race conditions
                    tournament = Tournament.objects.select_for_update().get(id=tournament_id)
                    
                    # Validate current status
                    if tournament.approval_status not in ['PENDING', 'CONDITIONAL_APPROVAL']:
                        failures.append({
                            'tournament_id': tournament_id,
                            'error': f'Cannot reject tournament with status {tournament.approval_status}'
                        })
                        failure_count += 1
                        continue
                    
                    # Store previous status for audit log
                    previous_status = tournament.approval_status
                    
                    # Update tournament approval fields
                    tournament.approval_status = 'REJECTED'
                    tournament.approval_date = timezone.now()
                    tournament.approved_by = request.user
                    tournament.rejection_reason = rejection_reason
                    tournament.save()
                    
                    # Create audit log entry
                    TournamentAuditLog.objects.create(
                        administrator=request.user,
                        action_type='BULK_REJECT',
                        tournament=tournament,
                        previous_status=previous_status,
                        new_status='REJECTED',
                        reason=rejection_reason,
                        metadata={
                            'ip_address': request.META.get('REMOTE_ADDR'),
                            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                            'bulk_operation': True,
                            'total_items': len(tournament_ids),
                        }
                    )
                    
                    rejected_tournament_ids.append(tournament_id)
                    success_count += 1
                    
            except Tournament.DoesNotExist:
                failures.append({
                    'tournament_id': tournament_id,
                    'error': 'Tournament not found'
                })
                failure_count += 1
            except Exception as e:
                failures.append({
                    'tournament_id': tournament_id,
                    'error': str(e)
                })
                failure_count += 1
        
        # Send notifications to all successfully rejected tournaments
        from .notification_utils import send_tournament_rejected_notification
        for tournament_id in rejected_tournament_ids:
            try:
                tournament = Tournament.objects.get(id=tournament_id)
                send_tournament_rejected_notification(tournament, request.user, rejection_reason)
            except Exception as e:
                # Log error but don't fail the bulk operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send notification for tournament {tournament_id}: {str(e)}")
        
        # Build response
        response_data = {
            'success_count': success_count,
            'failure_count': failure_count,
            'total_count': len(tournament_ids),
            'rejected_tournament_ids': rejected_tournament_ids,
        }
        
        if failures:
            response_data['failures'] = failures
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='conditional-approve', throttle_classes=[AdminApprovalThrottle])
    def conditional_approve(self, request, pk=None):
        """
        Set tournament to conditional approval status and request additional documents.
        
        Validates that the tournament is in PENDING status, updates approval_status to
        CONDITIONAL_APPROVAL, stores the list of requested_documents in JSONField,
        creates a TournamentAuditLog entry, sends notification to organizer, and
        returns updated tournament data.
        
        Request Body:
        - requested_documents (required): Array of document names/types to request
        - notes (optional): Additional notes explaining what documents are needed
        
        Rate Limiting: 100 requests per admin per hour
        
        Requirements: 14.1, 14.2, 14.6, 19.1, 19.5
        """
        tournament = self.get_object()
        
        # Validate current status
        if tournament.approval_status not in ['PENDING']:
            return Response(
                {
                    'error': f'Cannot conditionally approve tournament with status {tournament.approval_status}. '
                             'Only PENDING tournaments can be conditionally approved.'
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
        previous_status = tournament.approval_status
        
        # Update tournament approval fields
        tournament.approval_status = 'CONDITIONAL_APPROVAL'
        tournament.approval_date = timezone.now()
        tournament.approved_by = request.user
        tournament.requested_documents = requested_documents
        tournament.approval_notes = notes
        tournament.save()
        
        # Create audit log entry
        TournamentAuditLog.objects.create(
            administrator=request.user,
            action_type='CONDITIONAL_APPROVE',
            tournament=tournament,
            previous_status=previous_status,
            new_status='CONDITIONAL_APPROVAL',
            reason=f"Requested documents: {', '.join(requested_documents)}. {notes}",
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'requested_documents': requested_documents,
            }
        )
        
        # Send notification to organizer
        from .notification_utils import send_documents_requested_notification
        send_documents_requested_notification(
            resource=tournament,
            resource_type='tournament',
            admin_user=request.user,
            requested_documents=requested_documents
        )
        
        # Serialize and return updated tournament
        serializer = AdminTournamentDetailSerializer(tournament)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get tournament statistics with 60-second caching.
        
        Returns overall counts of tournaments by approval status and total count.
        
        Response Format:
        {
            "total": 30,
            "pending": 5,
            "approved": 20,
            "rejected": 3,
            "conditional_approval": 2
        }
        
        Requirements: 4.7, 20.5
        """
        # Try to get cached stats
        cache_key = 'admin_tournament_stats'
        cached_stats = cache.get(cache_key)
        
        if cached_stats is not None:
            return Response(cached_stats, status=status.HTTP_200_OK)
        
        # Calculate overall counts
        total = Tournament.objects.count()
        pending = Tournament.objects.filter(approval_status='PENDING').count()
        approved = Tournament.objects.filter(approval_status='APPROVED').count()
        rejected = Tournament.objects.filter(approval_status='REJECTED').count()
        conditional_approval = Tournament.objects.filter(
            approval_status='CONDITIONAL_APPROVAL'
        ).count()
        
        # Build response
        stats_data = {
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'conditional_approval': conditional_approval,
        }
        
        # Cache for 60 seconds
        cache.set(cache_key, stats_data, 60)
        
        return Response(stats_data, status=status.HTTP_200_OK)
