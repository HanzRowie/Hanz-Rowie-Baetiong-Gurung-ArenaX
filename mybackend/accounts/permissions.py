"""
Permission classes for the Admin Control System.
"""
from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permission class to restrict access to users with ADMIN role.
    
    Returns 403 Forbidden for non-admin users.
    
    Requirements: 2.2, 3.2, 4.2, 5.2, 6.2, 17.1, 17.2, 17.4
    """
    
    message = "You do not have permission to access this resource. Admin role required."
    
    def has_permission(self, request, view):
        """
        Check if the user is authenticated and has ADMIN role.
        """
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )
