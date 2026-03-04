"""
Admin Control System Throttle Classes
Provides rate limiting for admin endpoints to prevent abuse.
"""
from rest_framework.throttling import UserRateThrottle


class AdminRateThrottle(UserRateThrottle):
    """
    Rate throttle for admin endpoints.
    
    Limits administrators to 100 requests per minute to prevent abuse
    and ensure system stability under load.
    
    Requirements: 18.7
    
    Configuration:
    - Rate: 100 requests per minute per administrator
    - Scope: admin_api
    - Applied to: AdminUserViewSet
    
    Usage:
        class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
            throttle_classes = [AdminRateThrottle]
    
    Notes:
    - Rate limiting is per-user (authenticated admin)
    - Throttle resets every minute
    - Returns 429 Too Many Requests when limit exceeded
    - Response includes Retry-After header with seconds until reset
    """
    
    scope = 'admin_api'
    rate = '100/min'
