"""
WebSocket utility functions for tournament and venue approval events.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
"""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime


def broadcast_tournament_submitted(tournament):
    """
    Broadcast tournament submission to all connected admins.
    
    Requirements:
    - 7.1: Send WebSocket update when tournament is created with PENDING status
    - 7.5: Include resource_type, resource_id, new_status, timestamp
    
    Args:
        tournament: Tournament instance that was submitted
    """
    channel_layer = get_channel_layer()
    
    event_data = {
        'type': 'tournament_submitted',
        'resource_type': 'tournament',
        'resource_id': str(tournament.id),
        'new_status': tournament.approval_status,
        'timestamp': datetime.now().isoformat(),
        'tournament_title': tournament.title,
        'organizer_name': tournament.organizer.full_name,
        'sport_type': tournament.sport_type
    }
    
    # Send to admin dashboard group
    async_to_sync(channel_layer.group_send)(
        'admin_dashboard',
        event_data
    )


def broadcast_tournament_status_changed(tournament, previous_status):
    """
    Broadcast tournament status change to organizer and admins.
    
    Requirements:
    - 7.3: Send WebSocket update to organizer when tournament approval status changes
    - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
    
    Args:
        tournament: Tournament instance with updated status
        previous_status: Previous approval status
    """
    channel_layer = get_channel_layer()
    
    event_data = {
        'type': 'tournament_status_changed',
        'resource_type': 'tournament',
        'resource_id': str(tournament.id),
        'new_status': tournament.approval_status,
        'approval_date': tournament.approval_date.isoformat() if tournament.approval_date else None,
        'rejection_reason': tournament.rejection_reason or '',
        'approval_notes': getattr(tournament, 'approval_notes', '') or '',
        'tournament_title': tournament.title
    }
    
    # Send to organizer's personal channel
    async_to_sync(channel_layer.group_send)(
        f'user_{tournament.organizer.id}',
        event_data
    )
    
    # Also send to admin dashboard for real-time updates
    async_to_sync(channel_layer.group_send)(
        'admin_dashboard',
        event_data
    )


def broadcast_venue_submitted(venue):
    """
    Broadcast venue submission to all connected admins.
    
    Requirements:
    - 7.2: Send WebSocket update when venue is created with PENDING status
    - 7.5: Include resource_type, resource_id, new_status, timestamp
    
    Args:
        venue: Venue instance that was submitted
    """
    channel_layer = get_channel_layer()
    
    event_data = {
        'type': 'venue_submitted',
        'resource_type': 'venue',
        'resource_id': str(venue.id),
        'new_status': venue.approval_status,
        'timestamp': datetime.now().isoformat(),
        'venue_name': venue.name,
        'owner_name': venue.owner.full_name,
        'sport_type': venue.sport_type
    }
    
    # Send to admin dashboard group
    async_to_sync(channel_layer.group_send)(
        'admin_dashboard',
        event_data
    )


def broadcast_venue_status_changed(venue, previous_status):
    """
    Broadcast venue status change to venue owner and admins.
    
    Requirements:
    - 7.4: Send WebSocket update to venue owner when venue approval status changes
    - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
    
    Args:
        venue: Venue instance with updated status
        previous_status: Previous approval status
    """
    channel_layer = get_channel_layer()
    
    event_data = {
        'type': 'venue_status_changed',
        'resource_type': 'venue',
        'resource_id': str(venue.id),
        'new_status': venue.approval_status,
        'approval_date': venue.approval_date.isoformat() if venue.approval_date else None,
        'rejection_reason': venue.rejection_reason or '',
        'approval_notes': getattr(venue, 'approval_notes', '') or '',
        'venue_name': venue.name
    }
    
    # Send to venue owner's personal channel
    async_to_sync(channel_layer.group_send)(
        f'user_{venue.owner.id}',
        event_data
    )
    
    # Also send to admin dashboard for real-time updates
    async_to_sync(channel_layer.group_send)(
        'admin_dashboard',
        event_data
    )
