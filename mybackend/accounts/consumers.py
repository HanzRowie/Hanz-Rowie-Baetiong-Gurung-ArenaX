"""
Admin Dashboard WebSocket Consumer
Provides real-time updates for the admin dashboard.

Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
"""
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class AdminDashboardConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time admin dashboard updates.
    Broadcasts new registrations, approvals, and rejections to all connected admins.
    
    Requirements:
    - 12.2: WebSocket connection for admin dashboard
    - 12.6: Authentication and role verification
    """
    
    async def connect(self):
        """
        Accept connection only for authenticated admin users.
        
        Requirements:
        - 12.2: Establish WebSocket connection
        - 12.6: Verify ADMIN role before accepting
        """
        user = self.scope.get('user')
        
        # Verify authentication
        if not user or not user.is_authenticated:
            logger.warning("Unauthenticated user attempted to connect to admin dashboard")
            await self.close()
            return
        
        # Verify admin role
        if user.role != 'ADMIN':
            logger.warning(f"Non-admin user {user.id} ({user.role}) attempted to connect to admin dashboard")
            await self.close()
            return
        
        self.user = user
        
        # Join admin dashboard group
        self.group_name = 'admin_dashboard'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'message': 'Connected to admin dashboard',
            'user_id': str(self.user.id),
            'user_name': self.user.full_name
        })
        
        logger.info(f"Admin user {self.user.id} ({self.user.full_name}) connected to dashboard")
    
    async def disconnect(self, close_code):
        """
        Leave the admin dashboard group on disconnect.
        
        Requirements: 12.6
        """
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            logger.info(f"Admin user {self.user.id} ({self.user.full_name}) disconnected from dashboard")
        
        # Leave admin dashboard group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def new_user_registration(self, event):
        """
        Broadcast new user registration to all connected admins.
        
        Requirements:
        - 12.1: Broadcast new_user_registration event
        - 12.3: Update pending approvals count
        - 12.5: Display toast notification
        """
        await self.send_json({
            'type': 'new_user_registration',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_email': event['user_email'],
            'user_role': event['user_role'],
            'timestamp': event['timestamp']
        })
        
        logger.info(f"Broadcasted new user registration: {event['user_name']} ({event['user_id']})")
    
    async def user_approved(self, event):
        """
        Broadcast user approval to all connected admins.
        
        Requirements:
        - 12.3: Update dashboard on approval
        - 12.4: Broadcast user_approved event
        - 12.5: Display toast notification
        """
        await self.send_json({
            'type': 'user_approved',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'approved_by': event['approved_by']
        })
        
        logger.info(f"Broadcasted user approval: {event['user_name']} ({event['user_id']}) by {event['approved_by']}")
    
    async def user_rejected(self, event):
        """
        Broadcast user rejection to all connected admins.
        
        Requirements:
        - 12.3: Update dashboard on rejection
        - 12.4: Broadcast user_rejected event
        - 12.5: Display toast notification
        """
        await self.send_json({
            'type': 'user_rejected',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'rejected_by': event['rejected_by']
        })
        
        logger.info(f"Broadcasted user rejection: {event['user_name']} ({event['user_id']}) by {event['rejected_by']}")
    
    async def tournament_submitted(self, event):
        """
        Broadcast new tournament submission to all connected admins.
        
        Requirements:
        - 7.1: Send WebSocket update when tournament is created with PENDING status
        - 7.5: Include resource_type, resource_id, new_status, timestamp
        """
        await self.send_json({
            'type': 'tournament_submitted',
            'resource_type': 'tournament',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'timestamp': event['timestamp'],
            'tournament_title': event.get('tournament_title', ''),
            'organizer_name': event.get('organizer_name', ''),
            'sport_type': event.get('sport_type', '')
        })
        
        logger.info(f"Broadcasted tournament submission: {event.get('tournament_title')} ({event['resource_id']})")
    
    async def venue_submitted(self, event):
        """
        Broadcast new venue submission to all connected admins.
        
        Requirements:
        - 7.2: Send WebSocket update when venue is created with PENDING status
        - 7.5: Include resource_type, resource_id, new_status, timestamp
        """
        await self.send_json({
            'type': 'venue_submitted',
            'resource_type': 'venue',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'timestamp': event['timestamp'],
            'venue_name': event.get('venue_name', ''),
            'owner_name': event.get('owner_name', ''),
            'sport_type': event.get('sport_type', '')
        })
        
        logger.info(f"Broadcasted venue submission: {event.get('venue_name')} ({event['resource_id']})")
    
    async def tournament_status_changed(self, event):
        """
        Broadcast tournament status change to organizer.
        
        Requirements:
        - 7.3: Send WebSocket update to organizer when tournament approval status changes
        - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
        """
        await self.send_json({
            'type': 'tournament_status_changed',
            'resource_type': 'tournament',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'approval_date': event.get('approval_date'),
            'rejection_reason': event.get('rejection_reason', ''),
            'approval_notes': event.get('approval_notes', ''),
            'tournament_title': event.get('tournament_title', '')
        })
        
        logger.info(f"Broadcasted tournament status change: {event['resource_id']} -> {event['new_status']}")
    
    async def venue_status_changed(self, event):
        """
        Broadcast venue status change to venue owner.
        
        Requirements:
        - 7.4: Send WebSocket update to venue owner when venue approval status changes
        - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
        """
        await self.send_json({
            'type': 'venue_status_changed',
            'resource_type': 'venue',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'approval_date': event.get('approval_date'),
            'rejection_reason': event.get('rejection_reason', ''),
            'approval_notes': event.get('approval_notes', ''),
            'venue_name': event.get('venue_name', '')
        })
        
        logger.info(f"Broadcasted venue status change: {event['resource_id']} -> {event['new_status']}")



class UserNotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for organizers and venue owners to receive approval status updates.
    
    Requirements:
    - 7.3: Send tournament status changes to organizers
    - 7.4: Send venue status changes to venue owners
    """
    
    async def connect(self):
        """
        Accept connection for authenticated users (organizers and venue owners).
        
        Requirements:
        - 7.3, 7.4: Establish WebSocket connection for status updates
        """
        user = self.scope.get('user')
        
        # Verify authentication
        if not user or not user.is_authenticated:
            logger.warning("Unauthenticated user attempted to connect to user notifications")
            await self.close()
            return
        
        self.user = user
        
        # Join user-specific group for receiving status updates
        self.group_name = f'user_{user.id}'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'message': 'Connected to notification updates',
            'user_id': str(self.user.id),
            'user_name': self.user.full_name
        })
        
        logger.info(f"User {self.user.id} ({self.user.full_name}) connected to notification updates")
    
    async def disconnect(self, close_code):
        """
        Leave the user-specific group on disconnect.
        """
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            logger.info(f"User {self.user.id} ({self.user.full_name}) disconnected from notification updates")
        
        # Leave user-specific group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def tournament_status_changed(self, event):
        """
        Send tournament status change to organizer.
        
        Requirements:
        - 7.3: Send WebSocket update to organizer when tournament approval status changes
        - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
        """
        await self.send_json({
            'type': 'tournament_status_changed',
            'resource_type': 'tournament',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'approval_date': event.get('approval_date'),
            'rejection_reason': event.get('rejection_reason', ''),
            'approval_notes': event.get('approval_notes', ''),
            'tournament_title': event.get('tournament_title', '')
        })
        
        logger.info(f"Sent tournament status change to user {self.user.id}: {event['resource_id']} -> {event['new_status']}")
    
    async def venue_status_changed(self, event):
        """
        Send venue status change to venue owner.
        
        Requirements:
        - 7.4: Send WebSocket update to venue owner when venue approval status changes
        - 7.5: Include new_status, approval_date, rejection_reason (if applicable)
        """
        await self.send_json({
            'type': 'venue_status_changed',
            'resource_type': 'venue',
            'resource_id': event['resource_id'],
            'new_status': event['new_status'],
            'approval_date': event.get('approval_date'),
            'rejection_reason': event.get('rejection_reason', ''),
            'approval_notes': event.get('approval_notes', ''),
            'venue_name': event.get('venue_name', '')
        })
        
        logger.info(f"Sent venue status change to user {self.user.id}: {event['resource_id']} -> {event['new_status']}")
