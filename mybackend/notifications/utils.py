import logging
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from accounts.models import Notification

logger = logging.getLogger(__name__)

def send_notification(user, notification_type, title, message, related_id=None, tournament=None, action_url=None, priority='MEDIUM'):
    """
    Create a notification in the database and broadcast it via WebSocket.
    
    Args:
        user: CustomUser instance
        notification_type: String (one of Notification.NOTIFICATION_TYPES)
        title: String
        message: String
        related_id: UUID (optional)
        tournament: Tournament instance (optional)
        action_url: String (optional)
        priority: String (optional, default='MEDIUM')
    """
    try:
        # 1. Create notification in database
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_id=related_id,
            tournament=tournament,
            action_url=action_url,
            priority=priority
        )
        
        # 2. Broadcast via channel_layer.group_send
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"notifications_{user.id}"
            
            # Send notification data
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'message': {
                        'type': 'notification',
                        'notification': {
                            'id': str(notification.id),
                            'type': notification.notification_type,
                            'title': notification.title,
                            'message': notification.message,
                            'is_read': notification.read,
                            'created_at': notification.created_at.isoformat(),
                            'priority': notification.priority,
                            'action_url': notification.action_url or '/notifications',
                            'related_id': str(related_id) if related_id else None,
                            'tournament_id': str(tournament.id) if tournament else None
                        }
                    }
                }
            )
            
            # Send updated unread count
            unread_count = Notification.objects.filter(user=user, read=False).count()
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'message': {
                        'type': 'unread_count',
                        'count': unread_count
                    }
                }
            )
            
            logger.info(f"Broadcasted notification '{notification_type}' to user {user.id}")
        else:
            logger.warning(f"Could not get channel layer to broadcast notification to user {user.id}")
        
        return notification
    except Exception as e:
        logger.error(f"Error sending notification to user {user.id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

async def async_send_notification(user, notification_type, title, message, related_id=None, tournament=None, action_url=None, priority='MEDIUM'):
    """
    Async version of send_notification for use in Consumers.
    """
    from channels.db import database_sync_to_async
    
    try:
        # 1. Create notification in database (using database_sync_to_async)
        def create_notification():
            return Notification.objects.create(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                related_id=related_id,
                tournament=tournament,
                action_url=action_url,
                priority=priority
            )
            
        notification = await database_sync_to_async(create_notification)()
        
        # 2. Broadcast via channel_layer.group_send
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"notifications_{user.id}"
            
            # Send notification data
            await channel_layer.group_send(
                group_name,
                {
                    'type': 'notification_message',
                    'message': {
                        'type': 'notification',
                        'notification': {
                            'id': str(notification.id),
                            'type': notification.notification_type,
                            'title': notification.title,
                            'message': notification.message,
                            'is_read': notification.read,
                            'created_at': notification.created_at.isoformat(),
                            'priority': notification.priority,
                            'action_url': notification.action_url or '/notifications',
                            'related_id': str(related_id) if related_id else None,
                            'tournament_id': str(tournament.id) if tournament else None
                        }
                    }
                }
            )
            
            # Send updated unread count
            def get_unread_count():
                return Notification.objects.filter(user=user, read=False).count()
                
            unread_count = await database_sync_to_async(get_unread_count)()
            
            await channel_layer.group_send(
                group_name,
                {
                    'type': 'notification_message',
                    'message': {
                        'type': 'unread_count',
                        'count': unread_count
                    }
                }
            )
            
            logger.info(f"Broadcasted notification (async) '{notification_type}' to user {user.id}")
        else:
            logger.warning(f"Could not get channel layer to broadcast notification (async) to user {user.id}")
            
        return notification
    except Exception as e:
        logger.error(f"Error sending async notification to user {user.id}: {str(e)}")
        return None
