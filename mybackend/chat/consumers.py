import json
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Message, UserPresence, GroupChat, GroupMessage, GroupMessageReadReceipt
from .views import can_chat_with, can_access_group_chat

User = get_user_model()
logger = logging.getLogger(__name__)
from notifications.utils import async_send_notification

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user:
            await self.close()
            return

        # Only allow players to use chat
        if self.user.role != 'PLAYER':
            await self.close()
            return

        # Get the other user ID from URL path
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
        
        # User-specific presence channel
        self.user_presence_group = f'presence_{self.user.id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Join user presence group
        await self.channel_layer.group_add(
            self.user_presence_group,
            self.channel_name
        )

        # Update user presence to online
        await self.set_user_online(self.user, True)

        await self.accept()
        
        # Send presence status to the other user
        await self.notify_presence_change(self.user, True)
        
        logger.info(f"User {self.user.id} connected to chat with {self.other_user.id}")

    async def disconnect(self, close_code):
        # Update user presence to offline
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            await self.set_user_online(self.user, False)
            if hasattr(self, 'other_user') and self.other_user:
                await self.notify_presence_change(self.user, False)
            logger.info(f"User {self.user.id} disconnected from chat")
        
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        # Leave presence group
        if hasattr(self, 'user_presence_group'):
            await self.channel_layer.group_discard(
                self.user_presence_group,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            # Handle different message types
            if message_type == 'message':
                await self.handle_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'stop_typing':
                await self.handle_stop_typing(data)
            elif message_type == 'mark_delivered':
                await self.handle_mark_delivered(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': 'Internal server error'
            }))
    
    async def handle_message(self, data):
        """Handle sending a new message"""
        message = data.get('message', '').strip()

        if not message:
            return

        if len(message) > 1000:
            await self.send(text_data=json.dumps({
                'type': 'error',
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
                    'message_type': message_obj.message_type,
                    'status': message_obj.status,
                    'timestamp': message_obj.timestamp.isoformat(),
                    'read': message_obj.read,
                    'edited': message_obj.edited,
                    'deleted': message_obj.deleted,
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
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing',
                'user_id': str(self.user.id),
                'user_name': self.user.full_name
            }
        )
    
    async def handle_stop_typing(self, data):
        """Handle stop typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_stop_typing',
                'user_id': str(self.user.id)
            }
        )
    
    async def handle_mark_delivered(self, data):
        """Mark message as delivered"""
        message_id = data.get('message_id')
        if message_id:
            success = await self.mark_message_delivered(message_id)
            if success:
                # Notify sender that message was delivered
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_status_update',
                        'message_id': message_id,
                        'status': 'DELIVERED'
                    }
                )
    
    async def handle_mark_read(self, data):
        """Mark message as read"""
        message_id = data.get('message_id')
        if message_id:
            success = await self.mark_message_read(message_id)
            if success:
                # Notify sender that message was read
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_status_update',
                        'message_id': message_id,
                        'status': 'READ'
                    }
                )

    # Receive message from room group
    async def private_message(self, event):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    async def user_typing(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'user_name': event['user_name']
            }))
    
    async def user_stop_typing(self, event):
        """Send stop typing indicator to WebSocket"""
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'stop_typing',
                'user_id': event['user_id']
            }))
    
    async def message_status_update(self, event):
        """Send message status update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'status_update',
            'message_id': event['message_id'],
            'status': event['status']
        }))
    
    async def presence_update(self, event):
        """Send presence update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
            'last_seen': event.get('last_seen')
        }))
    
    async def notify_presence_change(self, user, is_online):
        """Notify other users about presence change"""
        # Get all users who have conversations with this user
        # For now, just notify the current conversation
        other_presence_group = f'presence_{self.other_user.id}'
        
        last_seen = None
        if not is_online:
            presence = await self.get_user_presence(user)
            if presence:
                last_seen = presence.last_seen.isoformat()
        
        await self.channel_layer.group_send(
            other_presence_group,
            {
                'type': 'presence_update',
                'user_id': str(user.id),
                'is_online': is_online,
                'last_seen': last_seen
            }
        )

    @database_sync_to_async
    def get_user_by_id(self, user_id):
        return User.objects.get(id=user_id)

    @database_sync_to_async
    def save_message(self, sender, receiver, content):
        return Message.objects.create(
            sender=sender, 
            receiver=receiver, 
            content=content,
            status='SENT',
            message_type='TEXT'
        )

    @database_sync_to_async
    def set_user_online(self, user, is_online):
        """Update user presence status"""
        presence, _ = UserPresence.objects.get_or_create(user=user)
        presence.is_online = is_online
        presence.save()
        return presence
    
    @database_sync_to_async
    def get_user_presence(self, user):
        """Get user presence"""
        try:
            return UserPresence.objects.get(user=user)
        except UserPresence.DoesNotExist:
            return None
    
    @database_sync_to_async
    def mark_message_delivered(self, message_id):
        """Mark message as delivered"""
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            if message.status == 'SENT':
                message.mark_as_delivered()
                return True
        except Message.DoesNotExist:
            pass
        return False
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            if message.status in ['SENT', 'DELIVERED']:
                message.mark_as_read()
                return True
        except Message.DoesNotExist:
            pass
        return False


class DirectChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for cross-role direct messaging.
    Supports all user roles with proper authorization checks.
    """
    
    async def connect(self):
        """
        Handle WebSocket connection.
        Validates authentication, joins user room, accepts connection, broadcasts online status.
        """
        self.user = self.scope.get('user')
        
        # Validate authentication
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)  # Authentication error
            return
        
        # Join user's personal room for receiving messages
        self.user_room = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_room, self.channel_name)
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Update user presence to online
        await self.set_user_online(self.user, True)
        
        # Broadcast online status to relevant users
        await self.broadcast_presence_status(self.user, True)
        
        logger.info(f"DirectChatConsumer: User {self.user.id} ({self.user.role}) connected")
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Leaves room, broadcasts offline status after 30 seconds.
        """
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            # Leave user's personal room
            if hasattr(self, 'user_room'):
                await self.channel_layer.group_discard(self.user_room, self.channel_name)
            
            # Wait 30 seconds before marking offline (allows for reconnection)
            await asyncio.sleep(30)
            
            # Update user presence to offline
            await self.set_user_online(self.user, False)
            
            # Broadcast offline status
            await self.broadcast_presence_status(self.user, False)
            
            logger.info(f"DirectChatConsumer: User {self.user.id} disconnected")
    
    async def receive(self, text_data):
        """
        Receive and route messages from WebSocket.
        Parses JSON and routes to appropriate handler based on message type.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Route to appropriate handler
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type == 'mark_delivered':
                await self.handle_mark_delivered(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                logger.warning(f"DirectChatConsumer: Unknown message type: {message_type}")
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"DirectChatConsumer: JSON decode error: {str(e)}")
            await self.send_error("Invalid JSON format. Please check your message and try again.")
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error in receive: {str(e)}", exc_info=True)
            await self.send_error("An error occurred while processing your message. Please try again.")
    
    async def handle_chat_message(self, data):
        """
        Handle sending a chat message.
        Validates authorization, persists message, sends to receiver, confirms to sender.
        Implements retry logic with exponential backoff up to 3 attempts.
        """
        receiver_id = data.get('receiver_id')
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'TEXT')
        
        # Validate content
        if not content:
            await self.send_error("Message content cannot be empty")
            return
        
        if len(content) > 1000:
            await self.send_error("Message too long (max 1000 characters)")
            return
        
        # Validate receiver_id
        if not receiver_id:
            await self.send_error("Receiver ID is required")
            return
        
        try:
            # Get receiver user
            receiver = await self.get_user_by_id(receiver_id)
            
            # Validate authorization using can_chat_with from views.py
            if not await self.check_can_chat_with(self.user, receiver):
                logger.warning(f"DirectChatConsumer: Unauthorized chat attempt from {self.user.id} to {receiver_id}")
                await self.send_error("You are not authorized to chat with this user")
                return
            
            # Persist message to database
            message = await self.save_message(self.user, receiver, content, message_type)
            
            # Create notification for receiver and broadcast via WebSocket
            is_viewing = await self.is_user_viewing_chat(receiver.id, self.user.id)
            if not is_viewing:
                await async_send_notification(
                    user=receiver,
                    notification_type='NEW_MESSAGE',
                    title=f'New message from {self.user.full_name or self.user.username}',
                    message=content[:100] + '...' if len(content) > 100 else content,
                    related_id=self.user.id,
                    action_url=f'/chats?user={self.user.id}'
                )
            
            # Serialize message for transmission
            message_data = await self.serialize_message(message)
            
            # Send to receiver with retry logic
            delivery_success = await self.send_with_retry(
                f"user_{receiver_id}",
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )
            
            # Send confirmation to sender
            await self.send(text_data=json.dumps({
                'type': 'message_sent',
                'message': message_data,
                'delivery_status': 'delivered' if delivery_success else 'failed'
            }))
            
            logger.info(f"DirectChatConsumer: Message sent from {self.user.id} to {receiver_id}")
            
        except User.DoesNotExist:
            await self.send_error("The recipient was not found. Please check and try again.")
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error handling chat message: {str(e)}", exc_info=True)
            await self.send_error("Failed to send message. Please try again.")
    
    async def handle_typing(self, data):
        """
        Handle typing indicator.
        Broadcasts typing indicator to receiver's room.
        """
        receiver_id = data.get('receiver_id')
        is_typing = data.get('is_typing', True)
        
        if not receiver_id:
            return
        
        try:
            # Broadcast typing indicator to receiver's room
            await self.channel_layer.group_send(
                f"user_{receiver_id}",
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user.id),
                    'user_name': self.user.full_name,
                    'is_typing': is_typing
                }
            )
            
            logger.debug(f"DirectChatConsumer: Typing indicator from {self.user.id} to {receiver_id}")
            
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error handling typing: {str(e)}")
    
    async def handle_mark_read(self, data):
        """
        Handle mark message as read.
        Updates read status and sends read receipt to sender.
        """
        message_id = data.get('message_id')
        
        if not message_id:
            await self.send_error("Message ID is required")
            return
        
        try:
            # Mark message as read
            success, sender_id = await self.mark_message_read(message_id)
            
            if success and sender_id:
                # Send read receipt to sender
                await self.channel_layer.group_send(
                    f"user_{sender_id}",
                    {
                        'type': 'read_receipt',
                        'message_id': message_id,
                        'read_by': str(self.user.id),
                        'read_at': timezone.now().isoformat()
                    }
                )
                
                logger.debug(f"DirectChatConsumer: Message {message_id} marked as read by {self.user.id}")
            
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error marking message as read: {str(e)}")
            await self.send_error("Failed to mark message as read")
    
    async def handle_mark_delivered(self, data):
        """
        Handle mark message as delivered.
        Updates delivery status and sends delivery receipt to sender.
        """
        message_id = data.get('message_id')
        
        if not message_id:
            return
        
        try:
            # Mark message as delivered
            success, sender_id = await self.mark_message_delivered(message_id)
            
            if success and sender_id:
                # Send delivery receipt to sender
                await self.channel_layer.group_send(
                    f"user_{sender_id}",
                    {
                        'type': 'delivery_receipt',
                        'message_id': message_id,
                        'delivered_to': str(self.user.id),
                        'delivered_at': timezone.now().isoformat()
                    }
                )
                
                logger.debug(f"DirectChatConsumer: Message {message_id} marked as delivered to {self.user.id}")
            
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error marking message as delivered: {str(e)}")
    
    # WebSocket event handlers (called by channel layer)
    
    async def chat_message(self, event):
        """
        Send chat message to WebSocket client.
        Called when a message is sent to this user's room.
        """
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    async def typing_indicator(self, event):
        """
        Send typing indicator to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'is_typing': event['is_typing']
        }))
    
    async def read_receipt(self, event):
        """
        Send read receipt to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'read_by': event['read_by'],
            'read_at': event['read_at']
        }))
    
    async def delivery_receipt(self, event):
        """
        Send delivery receipt to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'delivery_receipt',
            'message_id': event['message_id'],
            'delivered_to': event['delivered_to'],
            'delivered_at': event['delivered_at']
        }))
    
    async def presence_update(self, event):
        """
        Send presence update to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
            'last_seen': event.get('last_seen')
        }))
    
    # Helper methods
    
    async def send_error(self, message):
        """
        Send error message to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'error',
            'error': message
        }))
    
    async def send_with_retry(self, group_name, message, max_retries=3):
        """
        Send message with exponential backoff retry logic.
        Retries up to max_retries times with exponential backoff.
        Returns True if successful, False otherwise.
        """
        for attempt in range(max_retries):
            try:
                await self.channel_layer.group_send(group_name, message)
                return True
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"DirectChatConsumer: Failed to send message after {max_retries} attempts: {str(e)}")
                    return False
                
                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2 ** attempt
                logger.warning(f"DirectChatConsumer: Retry attempt {attempt + 1} after {wait_time}s")
                await asyncio.sleep(wait_time)
        
        return False
    
    async def broadcast_presence_status(self, user, is_online):
        """
        Broadcast presence status to all users who have conversations with this user.
        """
        try:
            # Get all users who have conversations with this user
            conversation_user_ids = await self.get_conversation_user_ids(user)
            
            last_seen = None
            if not is_online:
                presence = await self.get_user_presence(user)
                if presence:
                    last_seen = presence.last_seen.isoformat()
            
            # Broadcast to each user's room
            for user_id in conversation_user_ids:
                await self.channel_layer.group_send(
                    f"user_{user_id}",
                    {
                        'type': 'presence_update',
                        'user_id': str(user.id),
                        'is_online': is_online,
                        'last_seen': last_seen
                    }
                )
        except Exception as e:
            logger.error(f"DirectChatConsumer: Error broadcasting presence: {str(e)}")
    
    # Database operations (sync to async)
    
    @database_sync_to_async
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return User.objects.get(id=user_id)
    
    @database_sync_to_async
    def check_can_chat_with(self, user1, user2):
        """Check if two users can chat using the authorization logic from views.py"""
        return can_chat_with(user1, user2)
    
    @database_sync_to_async
    def save_message(self, sender, receiver, content, message_type='TEXT'):
        """Save message to database"""
        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
            message_type=message_type,
            status='SENT'
        )
    
    @database_sync_to_async
    def serialize_message(self, message):
        """Serialize message object to dictionary"""
        return {
            'id': str(message.id),
            'content': message.content,
            'message_type': message.message_type,
            'status': message.status,
            'timestamp': message.timestamp.isoformat(),
            'read': message.read,
            'edited': message.edited,
            'deleted': message.deleted,
            'sender': {
                'id': str(message.sender.id),
                'username': message.sender.username,
                'full_name': message.sender.full_name,
                'role': message.sender.role
            },
            'receiver': {
                'id': str(message.receiver.id),
                'username': message.receiver.username,
                'full_name': message.receiver.full_name,
                'role': message.receiver.role
            }
        }
    
    @database_sync_to_async
    def set_user_online(self, user, is_online):
        """Update user presence status"""
        presence, _ = UserPresence.objects.get_or_create(user=user)
        presence.is_online = is_online
        if not is_online:
            presence.last_seen = timezone.now()
        presence.save()
        return presence
    
    @database_sync_to_async
    def get_user_presence(self, user):
        """Get user presence"""
        try:
            return UserPresence.objects.get(user=user)
        except UserPresence.DoesNotExist:
            return None
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """
        Mark message as read.
        Returns (success, sender_id) tuple.
        """
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            if message.status in ['SENT', 'DELIVERED']:
                message.mark_as_read()
                return True, str(message.sender.id)
        except Message.DoesNotExist:
            pass
        return False, None
    
    @database_sync_to_async
    def mark_message_delivered(self, message_id):
        """
        Mark message as delivered.
        Returns (success, sender_id) tuple.
        """
        try:
            message = Message.objects.get(id=message_id, receiver=self.user)
            if message.status == 'SENT':
                message.mark_as_delivered()
                return True, str(message.sender.id)
        except Message.DoesNotExist:
            pass
        return False, None
    
    @database_sync_to_async
    def get_conversation_user_ids(self, user):
        """
        Get list of user IDs who have conversations with the given user.
        """
        # Get all users who have sent or received messages from this user
        from django.db.models import Q
        
        user_ids = set()
        
        # Users who sent messages to this user
        senders = Message.objects.filter(receiver=user).values_list('sender_id', flat=True).distinct()
        user_ids.update(str(uid) for uid in senders)
        
        # Users who received messages from this user
        receivers = Message.objects.filter(sender=user).values_list('receiver_id', flat=True).distinct()
        user_ids.update(str(uid) for uid in receivers)
        
        return list(user_ids)
    
    @database_sync_to_async
    def is_user_viewing_chat(self, user_id, chat_with_id):
        """Check if user is currently viewing a specific chat"""
        from django.core.cache import cache
        cache_key = f"user_{user_id}_viewing_chat"
        viewing_chat_user_id = cache.get(cache_key)
        return viewing_chat_user_id == str(chat_with_id)



class GroupChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for team-based group chat.
    Supports real-time messaging within team contexts with proper membership validation.
    """
    
    async def connect(self):
        """
        Handle WebSocket connection for group chat.
        Validates authentication, extracts team_id, validates membership, joins room, broadcasts user joined.
        """
        self.user = self.scope.get('user')
        
        # Validate authentication
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)  # Authentication error
            return
        
        # Extract team_id from URL route
        self.team_id = self.scope['url_route']['kwargs'].get('team_id')
        
        if not self.team_id:
            logger.error("GroupChatConsumer: No team_id in URL route")
            await self.close(code=4003)  # Invalid request
            return
        
        try:
            # Get team object
            from teams.models import Team
            self.team = await self.get_team_by_id(self.team_id)
            
            # Validate team membership using can_access_group_chat
            if not await self.check_can_access_group_chat(self.user, self.team):
                logger.warning(f"GroupChatConsumer: User {self.user.id} not authorized for team {self.team_id}")
                await self.close(code=4003)  # Forbidden
                return
            
            # Join team chat room
            self.room_group_name = f"group_chat_{self.team_id}"
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            
            # Accept the WebSocket connection
            await self.accept()
            
            # Broadcast user joined event
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user_id': str(self.user.id),
                    'user_name': self.user.full_name,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"GroupChatConsumer: User {self.user.id} ({self.user.full_name}) connected to team {self.team_id}")
            
        except Exception as e:
            logger.error(f"GroupChatConsumer: Error during connection: {str(e)}", exc_info=True)
            await self.close(code=4000)  # Internal error
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Leaves team chat room and broadcasts user left event.
        """
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            if hasattr(self, 'room_group_name'):
                # Broadcast user left event before leaving
                try:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'user_left',
                            'user_id': str(self.user.id),
                            'user_name': self.user.full_name,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                except Exception as e:
                    logger.error(f"GroupChatConsumer: Error broadcasting user left: {str(e)}")
                
                # Leave team chat room
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
                
                logger.info(f"GroupChatConsumer: User {self.user.id} disconnected from team {self.team_id}")
    
    async def receive(self, text_data):
        """
        Receive and route messages from WebSocket.
        Parses JSON and routes to appropriate handler based on message type.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Route to appropriate handler
            if message_type == 'group_message':
                await self.handle_group_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                logger.warning(f"GroupChatConsumer: Unknown message type: {message_type}")
                await self.send_error(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"GroupChatConsumer: JSON decode error: {str(e)}")
            await self.send_error("Invalid JSON format. Please check your message and try again.")
        except Exception as e:
            logger.error(f"GroupChatConsumer: Error in receive: {str(e)}", exc_info=True)
            await self.send_error("An error occurred while processing your message. Please try again.")
    
    async def handle_group_message(self, data):
        """
        Handle sending a group message.
        Validates team membership, persists message, broadcasts to all team members.
        """
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'TEXT')
        
        # Validate content
        if not content:
            await self.send_error("Message content cannot be empty")
            return
        
        if len(content) > 1000:
            await self.send_error("Message too long (max 1000 characters)")
            return
        
        try:
            # Validate team membership again (security check)
            if not await self.check_can_access_group_chat(self.user, self.team):
                logger.warning(f"GroupChatConsumer: User {self.user.id} no longer authorized for team {self.team_id}")
                await self.send_error("You are not authorized to send messages to this group")
                return
            
            # Persist message to database
            message = await self.save_group_message(self.team_id, self.user, content, message_type)
            
            # Create notifications for all team members except sender and broadcast
            await self.send_group_notifications(self.team, self.user, content)
            
            # Serialize message for transmission
            message_data = await self.serialize_group_message(message)
            
            # Broadcast to all team members in room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'group_message',
                    'message': message_data
                }
            )
            
            logger.info(f"GroupChatConsumer: Message sent by {self.user.id} to team {self.team_id}")
            
        except Exception as e:
            logger.error(f"GroupChatConsumer: Error handling group message: {str(e)}", exc_info=True)
            await self.send_error("Failed to send message. Please try again.")
    
    async def handle_typing(self, data):
        """
        Handle typing indicator.
        Broadcasts typing indicator to all team members.
        """
        is_typing = data.get('is_typing', True)
        
        try:
            # Broadcast typing indicator to all team members
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user.id),
                    'user_name': self.user.full_name,
                    'is_typing': is_typing
                }
            )
            
            logger.debug(f"GroupChatConsumer: Typing indicator from {self.user.id} in team {self.team_id}")
            
        except Exception as e:
            logger.error(f"GroupChatConsumer: Error handling typing: {str(e)}")
    
    # WebSocket event handlers (called by channel layer)
    
    async def group_message(self, event):
        """
        Send group message to WebSocket client.
        Called when a message is broadcast to the team room.
        """
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    async def user_joined(self, event):
        """
        Send user joined notification to WebSocket client.
        """
        # Don't send notification to the user who just joined
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'timestamp': event['timestamp']
            }))
    
    async def user_left(self, event):
        """
        Send user left notification to WebSocket client.
        """
        # Don't send notification to the user who left (they're disconnected anyway)
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'timestamp': event['timestamp']
            }))
    
    async def typing_indicator(self, event):
        """
        Send typing indicator to WebSocket client.
        """
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'is_typing': event['is_typing']
            }))
    
    # Helper methods
    
    async def send_error(self, message):
        """
        Send error message to WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': 'error',
            'error': message
        }))
    
    # Database operations (sync to async)
    
    @database_sync_to_async
    def get_team_by_id(self, team_id):
        """Get team by ID"""
        from teams.models import Team
        return Team.objects.get(id=team_id)
    
    @database_sync_to_async
    def check_can_access_group_chat(self, user, team):
        """Check if user can access team group chat using authorization logic from views.py"""
        return can_access_group_chat(user, team)
    
    @database_sync_to_async
    def save_group_message(self, team_id, sender, content, message_type='TEXT'):
        """Save group message to database"""
        # Get or create group chat for team
        group_chat, _ = GroupChat.objects.get_or_create(team_id=team_id)
        
        # Create message
        return GroupMessage.objects.create(
            group_chat=group_chat,
            sender=sender,
            content=content,
            message_type=message_type,
            status='SENT'
        )
    
    @database_sync_to_async
    def serialize_group_message(self, message):
        """Serialize group message object to dictionary"""
        return {
            'id': str(message.id),
            'content': message.content,
            'message_type': message.message_type,
            'status': message.status,
            'timestamp': message.timestamp.isoformat(),
            'edited': message.edited,
            'deleted': message.deleted,
            'sender': {
                'id': str(message.sender.id),
                'username': message.sender.username,
                'full_name': message.sender.full_name,
                'role': message.sender.role
            },
            'group_chat': {
                'id': str(message.group_chat.id),
                'team_id': str(message.group_chat.team_id),
                'team_name': message.group_chat.team.name
            }
        }
    
    async def send_group_notifications(self, team, sender, content):
        """Send notifications to team members except sender"""
        members = await self.get_team_members_to_notify(team, sender)
        preview = content[:100] + '...' if len(content) > 100 else content
        
        for member_player in members:
            is_viewing = await self.is_user_viewing_group(member_player.id, team.id)
            if not is_viewing:
                await async_send_notification(
                    user=member_player,
                    notification_type='NEW_GROUP_MESSAGE',
                    title=f'New message in {team.name}',
                    message=f'{sender.full_name or sender.username}: {preview}',
                    related_id=team.id,
                    action_url=f'/teams/{team.id}'
                )

    @database_sync_to_async
    def get_team_members_to_notify(self, team, sender):
        """Get members of a team except the sender"""
        from teams.models import TeamMembership
        members = TeamMembership.objects.filter(
            team=team,
            is_active=True
        ).exclude(player=sender).select_related('player')
        return [m.player for m in members]

    @database_sync_to_async
    def is_user_viewing_group(self, user_id, team_id):
        """Check if user is currently viewing a specific group chat"""
        from django.core.cache import cache
        cache_key = f"user_{user_id}_viewing_group_chat"
        viewing_group_chat_id = cache.get(cache_key)
        return str(viewing_group_chat_id) == str(team_id)
