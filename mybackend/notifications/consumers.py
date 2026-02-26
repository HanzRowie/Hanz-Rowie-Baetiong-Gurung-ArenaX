import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import Notification
from django.core.cache import cache


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.viewing_chat_user_id = None
        
        if not self.user or self.user.is_anonymous:
            await self.close()
            return
        
        # Create a unique group name for this user
        self.notification_group_name = f"notifications_{self.user.id}"
        
        # Join notification group
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send unread count on connection
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))

    async def disconnect(self, close_code):
        # Clear viewing chat status
        if self.viewing_chat_user_id:
            cache_key = f"user_{self.user.id}_viewing_chat"
            cache.delete(cache_key)
        
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'mark_as_read':
            notification_id = data.get('notification_id')
            await self.mark_notification_as_read(notification_id)
        elif message_type == 'get_unread_count':
            unread_count = await self.get_unread_count()
            await self.send(text_data=json.dumps({
                'type': 'unread_count',
                'count': unread_count
            }))
        elif message_type == 'viewing_chat':
            # User is viewing a specific direct chat
            user_id = data.get('user_id')
            if user_id:
                self.viewing_chat_user_id = user_id
                cache_key = f"user_{self.user.id}_viewing_chat"
                cache.set(cache_key, user_id, timeout=3600)  # 1 hour timeout
        elif message_type == 'viewing_group_chat':
            # User is viewing a specific group chat
            team_id = data.get('team_id')
            if team_id:
                cache_key = f"user_{self.user.id}_viewing_group_chat"
                cache.set(cache_key, team_id, timeout=3600)  # 1 hour timeout
        elif message_type == 'left_chat':
            # User left the direct chat view
            if self.viewing_chat_user_id:
                cache_key = f"user_{self.user.id}_viewing_chat"
                cache.delete(cache_key)
                self.viewing_chat_user_id = None
        elif message_type == 'left_group_chat':
            # User left the group chat view
            cache_key = f"user_{self.user.id}_viewing_group_chat"
            cache.delete(cache_key)

    async def notification_message(self, event):
        """Send notification to WebSocket"""
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_unread_count(self):
        return Notification.objects.filter(user=self.user, read=False).count()

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, user=self.user)
            notification.read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False
