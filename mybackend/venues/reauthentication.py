"""
Re-authentication utilities for large bulk operations.

Implements re-authentication requirement for bulk operations affecting >10 items.
Uses token refresh flow to verify admin identity before processing large operations.

Requirements: 19.3
"""
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from functools import wraps


class ReauthenticationRequired(Exception):
    """
    Exception raised when re-authentication is required for a bulk operation.
    """
    def __init__(self, message="Re-authentication required for this operation"):
        self.message = message
        super().__init__(self.message)


def check_reauthentication_required(request, item_count, threshold=10):
    """
    Check if re-authentication is required for a bulk operation.
    
    Re-authentication is required when:
    - The operation affects more than the threshold (default 10) items
    - The user has not recently re-authenticated (within last 5 minutes)
    
    Args:
        request: The HTTP request object
        item_count: Number of items in the bulk operation
        threshold: Minimum number of items that triggers re-authentication (default 10)
    
    Returns:
        tuple: (requires_reauth: bool, cache_key: str)
    
    Requirements: 19.3
    """
    if item_count <= threshold:
        return False, None
    
    # Generate cache key for this user's re-authentication status
    cache_key = f'reauth_{request.user.pk}'
    
    # Check if user has recently re-authenticated
    last_reauth = cache.get(cache_key)
    
    if last_reauth is not None:
        # User has re-authenticated recently
        return False, cache_key
    
    # Re-authentication required
    return True, cache_key


def mark_reauthenticated(request):
    """
    Mark that the user has successfully re-authenticated.
    Stores a flag in cache that expires after 5 minutes.
    
    Args:
        request: The HTTP request object
    
    Requirements: 19.3
    """
    cache_key = f'reauth_{request.user.pk}'
    # Store re-authentication flag for 5 minutes (300 seconds)
    cache.set(cache_key, timezone.now().isoformat(), 300)


def verify_reauthentication_token(request):
    """
    Verify the re-authentication token provided in the request.
    
    The token should be provided in the X-Reauth-Token header.
    This is a simplified implementation that checks for a valid JWT token
    that was issued recently (within last 30 seconds).
    
    Args:
        request: The HTTP request object
    
    Returns:
        bool: True if token is valid, False otherwise
    
    Requirements: 19.3
    """
    reauth_token = request.META.get('HTTP_X_REAUTH_TOKEN')
    
    if not reauth_token:
        return False
    
    # In a production system, you would:
    # 1. Decode the JWT token
    # 2. Verify it was issued recently (within last 30 seconds)
    # 3. Verify it matches the current user
    # 4. Verify it has the correct scope (re-authentication)
    
    # For this implementation, we'll use a simple approach:
    # The frontend should send a fresh token obtained from the /api/auth/refresh/ endpoint
    # We'll verify it's a valid token by checking if it matches the user's current token
    
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError
    
    try:
        # Decode and verify the token
        token = AccessToken(reauth_token)
        
        # Verify it belongs to the current user
        if str(token['user_id']) != str(request.user.pk):
            return False
        
        # Verify it was issued recently (within last 60 seconds)
        issued_at = token['iat']
        current_time = timezone.now().timestamp()
        
        if current_time - issued_at > 60:
            # Token is too old
            return False
        
        return True
        
    except TokenError:
        return False


def require_reauthentication(view_func):
    """
    Decorator to require re-authentication for bulk operations affecting >10 items.
    
    This decorator should be applied to bulk operation endpoints.
    It checks if re-authentication is required and validates the re-authentication token.
    
    Usage:
        @require_reauthentication
        def bulk_approve(self, request):
            # ... bulk operation logic
    
    Requirements: 19.3
    """
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        # Determine item count from request data
        item_count = 0
        
        if 'tournament_ids' in request.data:
            item_count = len(request.data.get('tournament_ids', []))
        elif 'venue_ids' in request.data:
            item_count = len(request.data.get('venue_ids', []))
        
        # Check if re-authentication is required
        requires_reauth, cache_key = check_reauthentication_required(request, item_count)
        
        if requires_reauth:
            # Check if re-authentication token is provided
            if not verify_reauthentication_token(request):
                return Response(
                    {
                        'error': 'Re-authentication required',
                        'detail': f'This operation affects {item_count} items. '
                                  'Please re-authenticate by providing a fresh token in the X-Reauth-Token header.',
                        'requires_reauthentication': True,
                        'item_count': item_count
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Mark user as re-authenticated
            mark_reauthenticated(request)
        
        # Proceed with the operation
        return view_func(self, request, *args, **kwargs)
    
    return wrapper
