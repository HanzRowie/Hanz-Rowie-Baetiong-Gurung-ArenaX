"""
Permission classes for tournament access control based on approval status.

This module implements access control middleware that:
- Blocks non-admin access to PENDING tournaments (returns 404)
- Blocks non-admin access to REJECTED tournaments (returns 404)
- Allows organizers to access their own PENDING/REJECTED tournaments
- Applies to list, detail, and booking endpoints
"""

from rest_framework import permissions
from rest_framework.exceptions import NotFound


class ApprovalStatusPermission(permissions.BasePermission):
    """
    Permission class that enforces approval status access control for tournaments.
    
    Access Rules:
    - APPROVED tournaments: Accessible to everyone
    - PENDING tournaments: Only accessible to admins and the organizer
    - REJECTED tournaments: Only accessible to admins and the organizer
    - CONDITIONAL_APPROVAL tournaments: Only accessible to admins and the organizer
    
    For non-authorized users, returns 404 instead of 403 to hide existence.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access this specific tournament.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The Tournament object
            
        Returns:
            bool: True if access is allowed
            
        Raises:
            NotFound: If user doesn't have access (returns 404 instead of 403)
        """
        # APPROVED tournaments are accessible to everyone
        if obj.approval_status == 'APPROVED':
            return True
        
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            raise NotFound("Tournament not found.")
        
        # Admins can access all tournaments
        if hasattr(request.user, 'role') and request.user.role == 'ADMIN':
            return True
        
        # Organizers can access their own tournaments regardless of status
        if obj.organizer == request.user:
            return True
        
        # All other users cannot access non-approved tournaments
        # Return 404 to hide existence
        raise NotFound("Tournament not found.")
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access the list view.
        This is called before has_object_permission.
        
        For list views, we allow the request to proceed and filter in get_queryset.
        For detail views, object-level permission will be checked.
        """
        return True


def filter_tournaments_by_approval_status(queryset, user):
    """
    Filter tournament queryset based on user's role and approval status.
    
    This function should be called in ViewSet.get_queryset() to filter
    tournaments based on approval status and user permissions.
    
    Args:
        queryset: The base Tournament queryset
        user: The requesting user
        
    Returns:
        Filtered queryset based on approval status access rules
    """
    # If user is not authenticated, only show APPROVED tournaments
    if not user or not user.is_authenticated:
        return queryset.filter(approval_status='APPROVED')
    
    # Admins can see all tournaments
    if hasattr(user, 'role') and user.role == 'ADMIN':
        return queryset
    
    # Organizers can see their own tournaments (all statuses) + all APPROVED tournaments
    if hasattr(user, 'role') and user.role == 'ORGANIZER':
        from django.db.models import Q
        return queryset.filter(
            Q(approval_status='APPROVED') | Q(organizer=user)
        )
    
    # All other users (PLAYER, REFEREE, VENUE_OWNER) only see APPROVED tournaments
    return queryset.filter(approval_status='APPROVED')
