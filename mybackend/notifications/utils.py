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
    logger.info(f"[NOTIFICATION_CORE] ========== Starting send_notification ==========")
    logger.info(f"[NOTIFICATION_CORE] User ID: {user.id}, Username: {user.username}, Email: {user.email}")
    logger.info(f"[NOTIFICATION_CORE] Type: {notification_type}, Priority: {priority}")
    logger.info(f"[NOTIFICATION_CORE] Title: {title}")
    logger.info(f"[NOTIFICATION_CORE] Message: {message}")
    logger.info(f"[NOTIFICATION_CORE] Action URL: {action_url}")
    logger.info(f"[NOTIFICATION_CORE] Related ID: {related_id}")
    logger.info(f"[NOTIFICATION_CORE] Tournament: {tournament.id if tournament else None}")
    
    try:
        # 1. Create notification in database
        logger.info(f"[NOTIFICATION_CORE] Step 1: Creating notification in database...")
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
        logger.info(f"[NOTIFICATION_CORE] ✓ Notification created in database with ID: {notification.id}")
        logger.info(f"[NOTIFICATION_CORE] Database record: user={notification.user.id}, type={notification.notification_type}, read={notification.read}")
        
        # 2. Broadcast via channel_layer.group_send
        logger.info(f"[NOTIFICATION_CORE] Step 2: Broadcasting via WebSocket...")
        channel_layer = get_channel_layer()
        
        if channel_layer:
            logger.info(f"[NOTIFICATION_CORE] ✓ Channel layer obtained successfully")
            group_name = f"notifications_{user.id}"
            logger.info(f"[NOTIFICATION_CORE] Target group: {group_name}")
            
            # Send notification data
            notification_payload = {
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
            logger.info(f"[NOTIFICATION_CORE] Sending notification payload to group {group_name}")
            
            async_to_sync(channel_layer.group_send)(group_name, notification_payload)
            logger.info(f"[NOTIFICATION_CORE] ✓ Notification payload sent to WebSocket group")
            
            # Send updated unread count
            unread_count = Notification.objects.filter(user=user, read=False).count()
            logger.info(f"[NOTIFICATION_CORE] Unread count for user {user.id}: {unread_count}")
            
            unread_payload = {
                'type': 'notification_message',
                'message': {
                    'type': 'unread_count',
                    'count': unread_count
                }
            }
            logger.info(f"[NOTIFICATION_CORE] Sending unread count payload to group {group_name}")
            
            async_to_sync(channel_layer.group_send)(group_name, unread_payload)
            logger.info(f"[NOTIFICATION_CORE] ✓ Unread count payload sent to WebSocket group")
            
            logger.info(f"[NOTIFICATION_CORE] ✓ Successfully broadcasted notification '{notification_type}' to user {user.id}")
        else:
            logger.warning(f"[NOTIFICATION_CORE] ✗ Could not get channel layer - WebSocket broadcast skipped")
            logger.warning(f"[NOTIFICATION_CORE] Notification saved to database but will not appear in real-time")
        
        logger.info(f"[NOTIFICATION_CORE] ========== send_notification completed successfully ==========")
        return notification
        
    except Exception as e:
        logger.error(f"[NOTIFICATION_CORE] ✗✗✗ ERROR in send_notification ✗✗✗")
        logger.error(f"[NOTIFICATION_CORE] Error type: {type(e).__name__}")
        logger.error(f"[NOTIFICATION_CORE] Error message: {str(e)}")
        logger.error(f"[NOTIFICATION_CORE] User: {user.id}, Type: {notification_type}")
        import traceback
        logger.error(f"[NOTIFICATION_CORE] Full traceback:\n{traceback.format_exc()}")
        logger.error(f"[NOTIFICATION_CORE] ========== send_notification FAILED ==========")
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
