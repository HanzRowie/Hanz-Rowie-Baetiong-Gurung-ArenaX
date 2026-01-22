import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # Only allow players to use chat
        if self.user.role != 'PLAYER':
            await self.close()
            return

        # Get the other user ID from URL path
        # URL pattern: ws/chat/<other_user_id>/
        other_user_id = self.scope['url_route']['kwargs'].get('user_id')

        if not other_user_id:
            await self.close()
            return

        try:
            self.other_user = await self.get_user_by_id(other_user_id)
        except User.DoesNotExist:
            await self.close()
            return

        # Only allow chatting with other players
        if self.other_user.role != 'PLAYER':
            await self.close()
            return

        # Create a unique room name for the conversation between two users
        # Sort IDs to ensure consistent room naming
        user_ids = sorted([str(self.user.id), other_user_id])
        self.room_name = f'private_chat_{user_ids[0]}_{user_ids[1]}'
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Update user's last seen to now (they're online)
        await self.update_user_last_seen(self.user)

        await self.accept()

    async def disconnect(self, close_code):
        # Update user's last seen when they disconnect
        if hasattr(self, 'user') and self.user:
            await self.update_user_last_seen(self.user)
        
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '').strip()

        if not message:
            return

        if len(message) > 1000:
            await self.send(text_data=json.dumps({
                'error': 'Message too long (max 1000 characters)'
            }))
            return

        # Save message to database
        message_obj = await self.save_message(
            self.user,
            self.other_user,
            message
        )

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'private_message',
                'message': {
                    'id': str(message_obj.id),
                    'content': message_obj.content,
                    'timestamp': message_obj.timestamp.isoformat(),
                    'read': message_obj.read,
                    'is_from_me': False,  # Will be computed by frontend based on current user
                    'sender': {
                        'id': str(message_obj.sender.id),
                        'username': message_obj.sender.username,
                        'full_name': message_obj.sender.full_name
                    },
                    'receiver': {
                        'id': str(message_obj.receiver.id),
                        'username': message_obj.receiver.username,
                        'full_name': message_obj.receiver.full_name
                    }
                }
            }
        )

    # Receive message from room group
    async def private_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def save_message(self, sender, receiver, content):
        return Message.objects.create(sender=sender, receiver=receiver, content=content)

    @database_sync_to_async
    def update_user_last_seen(self, user):
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        return user
