"""
Permission classes for venue access control based on approval status.

This module implements access control middleware that:
- Blocks non-admin access to PENDING venues (returns 404)
- Blocks non-admin access to REJECTED venues (returns 404)
- Allows venue owners to access their own PENDING/REJECTED venues
- Applies to list, detail, and booking endpoints
"""

from rest_framework import permissions
from rest_framework.exceptions import NotFound


class ApprovalStatusPermission(permissions.BasePermission):
    """
    Permission class that enforces approval status access control for venues.
    
    Access Rules:
    - APPROVED venues: Accessible to everyone
    - PENDING venues: Only accessible to admins and the venue owner
    - REJECTED venues: Only accessible to admins and the venue owner
    - CONDITIONAL_APPROVAL venues: Only accessible to admins and the venue owner
    
    For non-authorized users, returns 404 instead of 403 to hide existence.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access this specific venue.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The Venue object
            
        Returns:
            bool: True if access is allowed
            
        Raises:
            NotFound: If user doesn't have access (returns 404 instead of 403)
        """
        # APPROVED venues are accessible to everyone
        if obj.approval_status == 'APPROVED':
            return True
        
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            raise NotFound("Venue not found.")
        
        # Admins can access all venues
        if hasattr(request.user, 'role') and request.user.role == 'ADMIN':
            return True
        
        # Venue owners can access their own venues regardless of status
        if obj.owner == request.user:
            return True
        
        # All other users cannot access non-approved venues
        # Return 404 to hide existence
        raise NotFound("Venue not found.")
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access the list view.
        This is called before has_object_permission.
        
        For list views, we allow the request to proceed and filter in get_queryset.
        For detail views, object-level permission will be checked.
        """
        return True


def filter_venues_by_approval_status(queryset, user):
    """
    Filter venue queryset based on user's role and approval status.
    
    This function should be called in ViewSet.get_queryset() to filter
    venues based on approval status and user permissions.
    
    Args:
        queryset: The base Venue queryset
        user: The requesting user
        
    Returns:
        Filtered queryset based on approval status access rules
    """
    # If user is not authenticated, only show APPROVED venues
    if not user or not user.is_authenticated:
        return queryset.filter(approval_status='APPROVED')
    
    # Admins can see all venues
    if hasattr(user, 'role') and user.role == 'ADMIN':
        return queryset
    
    # Venue owners can see their own venues (all statuses) + all APPROVED venues
    if hasattr(user, 'role') and user.role == 'VENUE_OWNER':
        from django.db.models import Q
        return queryset.filter(
            Q(approval_status='APPROVED') | Q(owner=user)
        )
    
    # All other users (PLAYER, ORGANIZER, REFEREE) only see APPROVED venues
    return queryset.filter(approval_status='APPROVED')
