"""
Middleware for the Admin Control System.
"""
from django.http import JsonResponse
from django.urls import resolve


class ApprovalStatusMiddleware:
    """
    Middleware to check user approval status for protected endpoints.
    Blocks PENDING and REJECTED users from accessing protected resources.
    
    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
    """
    
    # Endpoints that don't require approval (by URL name)
    EXEMPT_PATHS = [
        'login',
        'register',
        'verify-otp',
        'resend-otp',
        'forgot-password',
        'reset-password',
        'refresh-token',
        'approval-status',  # Allow checking own status
        'token_obtain_pair',
        'token_refresh',
        'token_verify',
    ]
    
    # URL patterns that don't require approval (by path prefix)
    EXEMPT_PATTERNS = [
        '/api/auth/',
        '/api/public/',
        '/admin/',  # Django admin
        '/static/',
        '/media/',
        '/api/token/',
        '/api/accounts/register/',
        '/api/accounts/verify-otp/',
        '/api/accounts/resend-otp/',
        '/api/accounts/login/',
        '/api/accounts/forgot-password/',
        '/api/accounts/reset-password/',
        '/api/accounts/users/me/',  # Allow users to fetch their own profile for status page
        '/api/accounts/auth/logout/',  # Allow logout
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Debug logging
        print(f"ApprovalMiddleware: Checking path: {request.path}")
        
        # Check if path is exempt first
        if self._is_exempt(request.path):
            print("ApprovalMiddleware: Path is EXEMPT")
            return self.get_response(request)
        
        # Try to authenticate JWT token if present
        if not request.user.is_authenticated:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                try:
                    from accounts.auth import JWTAuthentication
                    jwt_auth = JWTAuthentication()
                    auth_result = jwt_auth.authenticate(request)
                    if auth_result:
                        request.user, _ = auth_result
                        print(f"ApprovalMiddleware: JWT authenticated user: {request.user.email}")
                except Exception as e:
                    print(f"ApprovalMiddleware: JWT auth failed: {e}")
        
        print(f"ApprovalMiddleware: User authenticated: {request.user.is_authenticated}")
        if request.user.is_authenticated:
            print(f"ApprovalMiddleware: User: {request.user.email}, Role: {request.user.role}, Status: {request.user.approval_status}")
        
        # Check if user is authenticated
        if not request.user.is_authenticated:
            print("ApprovalMiddleware: User not authenticated, allowing")
            return self.get_response(request)
        
        # Admin users bypass approval check
        if request.user.role == 'ADMIN':
            print("ApprovalMiddleware: User is ADMIN, bypassing")
            return self.get_response(request)
        
        # Check approval status
        if request.user.approval_status != 'APPROVED':
            print(f"ApprovalMiddleware: BLOCKING - User status is {request.user.approval_status}")
            error_detail = {
                'error': 'Account approval required',
                'detail': self._get_status_message(request.user.approval_status),
                'approval_status': request.user.approval_status,
            }
            
            # Include rejection reason if rejected
            if request.user.approval_status == 'REJECTED' and request.user.rejection_reason:
                error_detail['rejection_reason'] = request.user.rejection_reason
            
            return JsonResponse(error_detail, status=403)
        
        print("ApprovalMiddleware: User is APPROVED, allowing")
        return self.get_response(request)
    
    def _is_exempt(self, path):
        """
        Check if the path is exempt from approval checking.
        """
        # Check exact patterns
        for pattern in self.EXEMPT_PATTERNS:
            if path.startswith(pattern):
                return True
        
        # Check named paths
        try:
            resolved = resolve(path)
            if resolved.url_name in self.EXEMPT_PATHS:
                return True
        except Exception:
            pass
        
        return False
    
    def _get_status_message(self, status):
        """
        Get descriptive message based on approval status.
        """
        if status == 'PENDING':
            return 'Your account is pending administrator approval. You will be notified once approved.'
        elif status == 'REJECTED':
            return 'Your account registration was not approved. Please contact support for more information.'
        else:
            return 'Your account requires approval to access this resource.'
