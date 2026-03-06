"""
Security logging for admin endpoints.

Logs all failed authentication attempts and security-related events
on admin endpoints for audit and security monitoring.

Requirements: 19.4
"""
import logging
from django.utils import timezone
from django.core.cache import cache

# Configure security logger
security_logger = logging.getLogger('security')


def log_failed_authentication(request, reason='Invalid credentials'):
    """
    Log a failed authentication attempt on an admin endpoint.
    
    Logs include:
    - Timestamp
    - IP address
    - User agent
    - Requested endpoint
    - Failure reason
    
    Args:
        request: The HTTP request object
        reason: Reason for authentication failure
    
    Requirements: 19.4
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    endpoint = request.path
    method = request.method
    
    security_logger.warning(
        f"Failed authentication attempt | "
        f"IP: {ip_address} | "
        f"User-Agent: {user_agent} | "
        f"Endpoint: {method} {endpoint} | "
        f"Reason: {reason} | "
        f"Timestamp: {timezone.now().isoformat()}"
    )
    
    # Track failed attempts in cache for rate limiting
    cache_key = f'failed_auth_{ip_address}'
    failed_attempts = cache.get(cache_key, 0)
    cache.set(cache_key, failed_attempts + 1, 3600)  # Track for 1 hour
    
    # If too many failed attempts, log as critical
    if failed_attempts >= 5:
        security_logger.critical(
            f"Multiple failed authentication attempts detected | "
            f"IP: {ip_address} | "
            f"Count: {failed_attempts + 1} | "
            f"Timestamp: {timezone.now().isoformat()}"
        )


def log_permission_denied(request, user, reason='Insufficient permissions'):
    """
    Log a permission denied event on an admin endpoint.
    
    Args:
        request: The HTTP request object
        user: The user who was denied access
        reason: Reason for permission denial
    
    Requirements: 19.4
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    endpoint = request.path
    method = request.method
    user_id = user.pk if user and user.is_authenticated else 'Anonymous'
    
    security_logger.warning(
        f"Permission denied | "
        f"User ID: {user_id} | "
        f"IP: {ip_address} | "
        f"User-Agent: {user_agent} | "
        f"Endpoint: {method} {endpoint} | "
        f"Reason: {reason} | "
        f"Timestamp: {timezone.now().isoformat()}"
    )


def log_rate_limit_exceeded(request, user, throttle_scope):
    """
    Log a rate limit exceeded event.
    
    Args:
        request: The HTTP request object
        user: The user who exceeded the rate limit
        throttle_scope: The throttle scope that was exceeded
    
    Requirements: 19.4
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    endpoint = request.path
    method = request.method
    user_id = user.pk if user and user.is_authenticated else 'Anonymous'
    
    security_logger.warning(
        f"Rate limit exceeded | "
        f"User ID: {user_id} | "
        f"IP: {ip_address} | "
        f"User-Agent: {user_agent} | "
        f"Endpoint: {method} {endpoint} | "
        f"Throttle Scope: {throttle_scope} | "
        f"Timestamp: {timezone.now().isoformat()}"
    )


def log_suspicious_activity(request, user, activity_type, details):
    """
    Log suspicious activity on admin endpoints.
    
    Args:
        request: The HTTP request object
        user: The user associated with the activity
        activity_type: Type of suspicious activity
        details: Additional details about the activity
    
    Requirements: 19.4
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    endpoint = request.path
    method = request.method
    user_id = user.pk if user and user.is_authenticated else 'Anonymous'
    
    security_logger.warning(
        f"Suspicious activity detected | "
        f"Type: {activity_type} | "
        f"User ID: {user_id} | "
        f"IP: {ip_address} | "
        f"User-Agent: {user_agent} | "
        f"Endpoint: {method} {endpoint} | "
        f"Details: {details} | "
        f"Timestamp: {timezone.now().isoformat()}"
    )


def log_admin_action(request, user, action_type, resource_type, resource_id, details=''):
    """
    Log an admin action for audit trail.
    
    Args:
        request: The HTTP request object
        user: The admin user who performed the action
        action_type: Type of action (approve, reject, etc.)
        resource_type: Type of resource (tournament, venue)
        resource_id: ID of the affected resource
        details: Additional details about the action
    
    Requirements: 19.4
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    
    security_logger.info(
        f"Admin action | "
        f"Action: {action_type} | "
        f"Resource: {resource_type} #{resource_id} | "
        f"Admin ID: {user.pk} | "
        f"IP: {ip_address} | "
        f"User-Agent: {user_agent} | "
        f"Details: {details} | "
        f"Timestamp: {timezone.now().isoformat()}"
    )


def get_client_ip(request):
    """
    Get the client's IP address from the request.
    Handles X-Forwarded-For header for proxied requests.
    
    Args:
        request: The HTTP request object
    
    Returns:
        str: The client's IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Get the first IP in the chain (client IP)
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'Unknown')
    return ip


class SecurityLoggingMiddleware:
    """
    Middleware to log security events on admin endpoints.
    
    Logs:
    - Failed authentication attempts
    - Permission denied events
    - Rate limit exceeded events
    
    Requirements: 19.4
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Only log for admin endpoints
        if request.path.startswith('/api/admin/'):
            # Log failed authentication (401)
            if response.status_code == 401:
                log_failed_authentication(
                    request,
                    reason='Authentication credentials not provided or invalid'
                )
            
            # Log permission denied (403)
            elif response.status_code == 403:
                user = request.user if hasattr(request, 'user') else None
                
                # Check if it's a rate limit error
                if hasattr(response, 'data') and isinstance(response.data, dict):
                    if 'throttle' in str(response.data).lower():
                        log_rate_limit_exceeded(request, user, 'admin_approval')
                    else:
                        log_permission_denied(request, user)
                else:
                    log_permission_denied(request, user)
        
        return response
