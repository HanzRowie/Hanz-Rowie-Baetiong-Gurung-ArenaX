"""
Rate limiting throttles for venue admin endpoints.

Implements rate limiting to prevent abuse of approval endpoints:
- 100 requests per admin per hour for approval/rejection actions
- Bulk operations limited to 50 items per request (enforced in views)

Requirements: 19.1, 19.2, 19.5
"""
from rest_framework.throttling import UserRateThrottle


class AdminApprovalThrottle(UserRateThrottle):
    """
    Rate limit for admin approval/rejection actions.
    Limits to 100 requests per admin per hour.
    
    Applied to:
    - approve endpoint
    - reject endpoint
    - conditional-approve endpoint
    - bulk-approve endpoint
    - bulk-reject endpoint
    
    Requirements: 19.1, 19.5
    """
    scope = 'admin_approval'
    rate = '100/hour'
    
    def get_cache_key(self, request, view):
        """
        Generate cache key based on user ID and scope.
        Only applies to authenticated admin users.
        """
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Only apply to admin users
        if not hasattr(request.user, 'role') or request.user.role != 'ADMIN':
            return None
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': request.user.pk
        }
    
    def throttle_failure(self):
        """
        Called when rate limit is exceeded.
        Returns False to indicate throttling should occur.
        """
        return False
    
    def wait(self):
        """
        Calculate how long to wait before next request is allowed.
        Returns wait time in seconds.
        """
        if self.history:
            remaining_duration = self.duration - (self.now - self.history[-1])
            return remaining_duration
        return None
