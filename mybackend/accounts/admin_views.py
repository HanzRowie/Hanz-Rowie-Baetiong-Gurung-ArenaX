"""
Admin Control System API Views
Provides endpoints for user management and approval workflow.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from datetime import timedelta

from .models import CustomUser, AdminAuditLog
from .serializers import AdminUserListSerializer, AdminUserDetailSerializer
from .permissions import IsAdminUser
from .throttles import AdminRateThrottle


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin API for user management and approval workflow.
    
    Endpoints:
    - GET /api/admin/users/ - List users with filtering and pagination
    - GET /api/admin/users/{id}/ - Get detailed user information
    - PATCH /api/admin/users/{id}/approve/ - Approve user (Task 5)
    - PATCH /api/admin/users/{id}/reject/ - Reject user (Task 5)
    - POST /api/admin/users/bulk-approve/ - Bulk approve (Task 6)
    - POST /api/admin/users/bulk-reject/ - Bulk reject (Task 6)
    - GET /api/admin/users/stats/ - Get statistics (Task 6)
    
    Requirements: 2.1, 2.2, 3.1, 3.2, 17.1, 17.2, 18.1, 18.2, 18.3, 18.7
    """
    
    permission_classes = [IsAdminUser]
    throttle_classes = [AdminRateThrottle]
    
    def get_permissions(self):
        """
        Allow unauthenticated access to document endpoints if they have a valid token.
        Standard behavior for <img> and <iframe> tags which don't send headers.
        """
        action = getattr(self, 'action', None)
        if action in ['get_business_document', 'get_certification_document', 'get_verification_document']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_authenticators(self):
        """
        Disable authentication for document endpoints to prevent 401 errors
        when accessed via <img> or <iframe> tags.
        Note: self.action might not be set yet when this is called.
        """
        action = getattr(self, 'action', None)
        path = self.request.path if hasattr(self, 'request') else ''
        
        is_document_path = any(p in path for p in ['/certification-document/', '/business-document/', '/document/'])
        
        if action in ['get_business_document', 'get_certification_document', 'get_verification_document'] or is_document_path:
            return []
        return super().get_authenticators()

    def get_serializer_class(self):
        """
        Use different serializers for list and detail views.
        """
        if getattr(self, 'action', None) == 'retrieve':
            return AdminUserDetailSerializer
        return AdminUserListSerializer
    
    def get_queryset(self):
        """
        Optimized queryset with filtering support.
        
        Filters:
        - role: Filter by user role (PLAYER, ORGANIZER, REFEREE, VENUE_OWNER, ADMIN)
        - status: Filter by approval_status (PENDING, APPROVED, REJECTED)
        - registration_date_from: Filter users registered after this date
        - registration_date_to: Filter users registered before this date
        - search: Search by name or email (case-insensitive)
        
        Optimizations:
        - select_related for approved_by to avoid N+1 queries
        - prefetch_related for audit_logs (used in detail view)
        
        Requirements: 2.3, 2.4, 2.5, 2.6, 18.2, 18.3
        """
        queryset = CustomUser.objects.select_related(
            'approved_by'
        ).prefetch_related(
            'audit_logs'
        )
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by approval status
        approval_status = self.request.query_params.get('status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
        
        # Filter by date range
        date_from = self.request.query_params.get('registration_date_from')
        date_to = self.request.query_params.get('registration_date_to')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | 
                Q(email__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """
        Approve a pending user registration.
        
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
        
        Workflow:
        1. Validate user is not already approved
        2. Update approval_status, approval_date, approved_by
        3. Create audit log entry
        4. Send approval notification
        5. Broadcast WebSocket event to admin dashboard
        
        Returns:
            200: User successfully approved with updated user data
            400: User is already approved
            403: Permission denied (non-admin)
            404: User not found
        """
        user = self.get_object()
        
        # Validate current status
        if user.approval_status == 'APPROVED':
            return Response(
                {'error': 'User is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user status
        user.approval_status = 'APPROVED'
        user.approval_date = timezone.now()
        user.approved_by = request.user
        user.save()
        
        # Create audit log entry
        AdminAuditLog.objects.create(
            administrator=request.user,
            action_type='APPROVE',
            target_user=user,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT'),
            }
        )
        
        # Send approval notification
        from notifications.utils import send_notification
        send_notification(
            user=user,
            notification_type='ACCOUNT_APPROVED',
            title='Account Approved',
            message='Your account has been approved. Welcome to Arena X!',
            action_url='/dashboard'
        )
        
        # Send approval email
        from django.core.mail import send_mail
        from django.conf import settings
        try:
            send_mail(
                subject='Account Approved - Arena X',
                message=f'''
Hello {user.full_name},

Great news! Your Arena X account has been approved by our administrators.

You can now log in and access all features of the platform.

Login here: {settings.FRONTEND_URL}/login

Welcome to Arena X!

Best regards,
The Arena X Team
                '''.strip(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send approval email to {user.email}: {e}")
        
        # Broadcast WebSocket event to admin dashboard
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'admin_dashboard',
                {
                    'type': 'user_approved',
                    'user_id': str(user.id),
                    'user_name': user.full_name,
                    'approved_by': request.user.full_name,
                }
            )
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """
        Reject a user registration with reason.
        
        Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
        
        Workflow:
        1. Validate rejection_reason (minimum 10 characters)
        2. Update approval_status, approval_date, approved_by, rejection_reason
        3. Create audit log entry
        4. Send rejection notification with reason
        5. Broadcast WebSocket event to admin dashboard
        
        Request Body:
            {
                "rejection_reason": "string (min 10 characters)"
            }
        
        Returns:
            200: User successfully rejected with updated user data
            400: Invalid rejection reason
            403: Permission denied (non-admin)
            404: User not found
        """
        user = self.get_object()
        rejection_reason = request.data.get('rejection_reason')
        
        # Validate rejection reason
        if not rejection_reason or len(rejection_reason) < 10:
            return Response(
                {'error': 'Rejection reason must be at least 10 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update user status
        user.approval_status = 'REJECTED'
        user.approval_date = timezone.now()
        user.approved_by = request.user
        user.rejection_reason = rejection_reason
        user.save()
        
        # Create audit log entry
        AdminAuditLog.objects.create(
            administrator=request.user,
            action_type='REJECT',
            target_user=user,
            rejection_reason=rejection_reason,
            metadata={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT'),
            }
        )
        
        # Send rejection notification
        from notifications.utils import send_notification
        send_notification(
            user=user,
            notification_type='ACCOUNT_REJECTED',
            title='Account Registration Not Approved',
            message=f'Your account registration was not approved. Reason: {rejection_reason}',
            action_url='/account-status'
        )
        
        # Send rejection email
        from django.core.mail import send_mail
        from django.conf import settings
        try:
            send_mail(
                subject='Account Registration Not Approved - Arena X',
                message=f'''
Hello {user.full_name},

We regret to inform you that your Arena X account registration was not approved.

Reason: {rejection_reason}

If you believe this was a mistake or would like to discuss this decision, please contact our support team at support@arenax.com.

Best regards,
The Arena X Team
                '''.strip(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send rejection email to {user.email}: {e}")
        
        # Broadcast WebSocket event to admin dashboard
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'admin_dashboard',
                {
                    'type': 'user_rejected',
                    'user_id': str(user.id),
                    'user_name': user.full_name,
                    'rejected_by': request.user.full_name,
                }
            )
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get aggregated user statistics for dashboard.
        
        Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
        
        Returns statistics including:
        - total_users: Total count of all registered users
        - pending_approvals: Count of users with PENDING status
        - approved_today: Count of users approved in last 24 hours
        - rejected_total: Count of users with REJECTED status
        - by_role: Counts grouped by role and approval_status
        
        Optimizations:
        - Uses database aggregation for efficiency
        - Single query for role-status breakdown
        
        Returns:
            200: Statistics object
            403: Permission denied (non-admin)
        """
        # Calculate date 24 hours ago
        yesterday = timezone.now() - timedelta(hours=24)
        
        # Aggregate statistics using efficient database queries
        stats = {
            'total_users': CustomUser.objects.count(),
            'pending_approvals': CustomUser.objects.filter(
                approval_status='PENDING'
            ).count(),
            'approved_today': CustomUser.objects.filter(
                approval_status='APPROVED',
                approval_date__gte=yesterday
            ).count(),
            'rejected_total': CustomUser.objects.filter(
                approval_status='REJECTED'
            ).count(),
            'by_role': {}
        }
        
        # Group by role and status using single aggregation query
        role_stats = CustomUser.objects.values('role', 'approval_status').annotate(
            count=Count('id')
        )
        
        # Build nested structure for role-status breakdown
        for stat in role_stats:
            role = stat['role']
            if role not in stats['by_role']:
                stats['by_role'][role] = {
                    'PENDING': 0,
                    'APPROVED': 0,
                    'REJECTED': 0
                }
            stats['by_role'][role][stat['approval_status']] = stat['count']
        
        return Response(stats)
    
    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        """
        Approve multiple users at once.
        
        Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.7
        
        Workflow:
        1. Validate user_ids array is provided
        2. Filter for PENDING users only
        3. Update all to APPROVED status
        4. Send approval notification to each user
        5. Create single audit log entry for bulk operation
        6. Return summary of successful operations
        
        Request Body:
            {
                "user_ids": ["uuid1", "uuid2", ...]
            }
        
        Returns:
            200: Success with summary (approved_count, total_requested)
            400: Invalid request (missing user_ids)
            403: Permission denied (non-admin)
        """
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'user_ids array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter for PENDING users only
        users = CustomUser.objects.filter(
            id__in=user_ids,
            approval_status='PENDING'
        )
        
        approved_count = 0
        approved_user_ids = []
        
        # Process each user
        for user in users:
            user.approval_status = 'APPROVED'
            user.approval_date = timezone.now()
            user.approved_by = request.user
            user.save()
            
            # Send approval notification
            from notifications.utils import send_notification
            send_notification(
                user=user,
                notification_type='ACCOUNT_APPROVED',
                title='Account Approved',
                message='Your account has been approved. Welcome to Arena X!',
                action_url='/dashboard'
            )
            
            approved_count += 1
            approved_user_ids.append(str(user.id))
        
        # Create single audit log entry for bulk operation
        AdminAuditLog.objects.create(
            administrator=request.user,
            action_type='BULK_APPROVE',
            target_user_ids=approved_user_ids,
            metadata={
                'approved_count': approved_count,
                'total_requested': len(user_ids),
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT'),
            }
        )
        
        # Broadcast WebSocket event to admin dashboard
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'admin_dashboard',
                {
                    'type': 'bulk_approve_completed',
                    'approved_count': approved_count,
                    'approved_by': request.user.full_name,
                }
            )
        
        return Response({
            'success': True,
            'approved_count': approved_count,
            'total_requested': len(user_ids)
        })
    
    @action(detail=False, methods=['post'], url_path='bulk-reject')
    def bulk_reject(self, request):
        """
        Reject multiple users with a single reason.
        
        Requirements: 15.1, 15.2, 15.3, 15.4, 15.6, 15.8
        
        Workflow:
        1. Validate user_ids array and rejection_reason
        2. Filter for PENDING users only
        3. Update all to REJECTED status with reason
        4. Send rejection notification to each user
        5. Create single audit log entry for bulk operation
        6. Return summary of successful operations
        
        Request Body:
            {
                "user_ids": ["uuid1", "uuid2", ...],
                "rejection_reason": "string (min 10 characters)"
            }
        
        Returns:
            200: Success with summary (rejected_count, total_requested)
            400: Invalid request (missing fields or invalid reason)
            403: Permission denied (non-admin)
        """
        user_ids = request.data.get('user_ids', [])
        rejection_reason = request.data.get('rejection_reason')
        
        # Validate user_ids
        if not user_ids:
            return Response(
                {'error': 'user_ids array is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate rejection reason
        if not rejection_reason or len(rejection_reason) < 10:
            return Response(
                {'error': 'Rejection reason must be at least 10 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter for PENDING users only
        users = CustomUser.objects.filter(
            id__in=user_ids,
            approval_status='PENDING'
        )
        
        rejected_count = 0
        rejected_user_ids = []
        
        # Process each user
        for user in users:
            user.approval_status = 'REJECTED'
            user.approval_date = timezone.now()
            user.approved_by = request.user
            user.rejection_reason = rejection_reason
            user.save()
            
            # Send rejection notification
            from notifications.utils import send_notification
            send_notification(
                user=user,
                notification_type='ACCOUNT_REJECTED',
                title='Account Registration Not Approved',
                message=f'Your account registration was not approved. Reason: {rejection_reason}',
                action_url='/account-status'
            )
            
            rejected_count += 1
            rejected_user_ids.append(str(user.id))
        
        # Create single audit log entry for bulk operation
        AdminAuditLog.objects.create(
            administrator=request.user,
            action_type='BULK_REJECT',
            target_user_ids=rejected_user_ids,
            rejection_reason=rejection_reason,
            metadata={
                'rejected_count': rejected_count,
                'total_requested': len(user_ids),
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT'),
            }
        )
        
        # Broadcast WebSocket event to admin dashboard
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'admin_dashboard',
                {
                    'type': 'bulk_reject_completed',
                    'rejected_count': rejected_count,
                    'rejected_by': request.user.full_name,
                }
            )
        
        return Response({
            'success': True,
            'rejected_count': rejected_count,
            'total_requested': len(user_ids)
        })

    
    @method_decorator(xframe_options_exempt)
    @action(detail=True, methods=['get'], url_path='business-document')
    def get_business_document(self, request, pk=None):
        """
        Serve business document with signed URL validation.
        Only accessible by admin users.
        """
        from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
        from django.http import FileResponse, Http404
        
        user = self.get_object()
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify signed token (valid for 1 hour)
        signer = TimestampSigner()
        try:
            unsigned_value = signer.unsign(token, max_age=3600)
            if unsigned_value != str(user.id):
                return Response(
                    {'error': 'Invalid token'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (SignatureExpired, BadSignature):
            return Response(
                {'error': 'Token expired or invalid'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if document exists
        if not user.business_document:
            raise Http404('Business document not found')
        
        # Log document access (only if authenticated)
        if request.user and request.user.is_authenticated:
            AdminAuditLog.objects.create(
                administrator=request.user,
                action_type='VIEW_DOCUMENT',
                target_user=user,
                metadata={
                    'document_type': 'business_document',
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'access_method': 'token_only' if not request.user.is_authenticated else 'authenticated'
                }
            )
        
        # Serve file
        return FileResponse(
            user.business_document.open('rb'),
            as_attachment=False,
            filename=user.business_document.name.split('/')[-1]
        )
    
    @method_decorator(xframe_options_exempt)
    @action(detail=True, methods=['get'], url_path='certification-document')
    def get_certification_document(self, request, pk=None):
        """
        Serve certification document with signed URL validation.
        Only accessible by admin users.
        """
        from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
        from django.http import FileResponse, Http404
        
        user = self.get_object()
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify signed token (valid for 1 hour)
        signer = TimestampSigner()
        try:
            unsigned_value = signer.unsign(token, max_age=3600)
            if unsigned_value != str(user.id):
                return Response(
                    {'error': 'Invalid token'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (SignatureExpired, BadSignature):
            return Response(
                {'error': 'Token expired or invalid'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if document exists
        if not user.certification_document:
            raise Http404('Certification document not found')
        
        # Log document access (only if authenticated)
        if request.user and request.user.is_authenticated:
            AdminAuditLog.objects.create(
                administrator=request.user,
                action_type='VIEW_DOCUMENT',
                target_user=user,
                metadata={
                    'document_type': 'certification_document',
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'access_method': 'token_only' if not request.user.is_authenticated else 'authenticated'
                }
            )
        
        # Serve file
        return FileResponse(
            user.certification_document.open('rb'),
            as_attachment=False,
            filename=user.certification_document.name.split('/')[-1]
        )
    
    @method_decorator(xframe_options_exempt)
    @action(detail=True, methods=['get'], url_path='document')
    def get_verification_document(self, request, pk=None):
        """
        Serve verification document with signed URL validation.
        Only accessible by admin users.
        (Legacy endpoint - kept for backward compatibility)
        """
        from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
        from django.http import FileResponse, Http404
        
        user = self.get_object()
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify signed token (valid for 1 hour)
        signer = TimestampSigner()
        try:
            unsigned_value = signer.unsign(token, max_age=3600)
            if unsigned_value != str(user.id):
                return Response(
                    {'error': 'Invalid token'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (SignatureExpired, BadSignature):
            return Response(
                {'error': 'Token expired or invalid'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if document exists
        if not user.verification_document:
            raise Http404('Verification document not found')
        
        # Log document access (only if authenticated)
        if request.user and request.user.is_authenticated:
            AdminAuditLog.objects.create(
                administrator=request.user,
                action_type='VIEW_DOCUMENT',
                target_user=user,
                metadata={
                    'document_type': 'verification_document',
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'access_method': 'token_only' if not request.user.is_authenticated else 'authenticated'
                }
            )
        
        # Serve file
        return FileResponse(
            user.verification_document.open('rb'),
            as_attachment=False,
            filename=user.verification_document.name.split('/')[-1]
        )
