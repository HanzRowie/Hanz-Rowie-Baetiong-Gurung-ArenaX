"""
Notification utilities for tournament and venue approval workflow.
Integrates with the existing notification system to send approval/rejection notifications.
"""
import logging
from notifications.utils import send_notification

logger = logging.getLogger(__name__)


def send_tournament_approved_notification(tournament, admin_user):
    """
    Send notification to organizer when tournament is approved.
    
    Args:
        tournament: Tournament instance
        admin_user: CustomUser instance (admin who approved)
    
    Requirements: 15.1, 15.6
    """
    logger.info(f"[NOTIFICATION] Starting send_tournament_approved_notification")
    logger.info(f"[NOTIFICATION] Tournament ID: {tournament.id}, Title: {tournament.title}")
    logger.info(f"[NOTIFICATION] Organizer ID: {tournament.organizer.id}, Name: {tournament.organizer.full_name}, Email: {tournament.organizer.email}")
    logger.info(f"[NOTIFICATION] Admin ID: {admin_user.id}, Name: {admin_user.full_name}")
    logger.info(f"[NOTIFICATION] Approval Date: {tournament.approval_date}")
    
    try:
        notification = send_notification(
            user=tournament.organizer,
            notification_type='TOURNAMENT_APPROVED',
            title='Tournament Approved',
            message=f'Your tournament "{tournament.title}" has been approved and is now live! '
                    f'Approved on {tournament.approval_date.strftime("%B %d, %Y")}.',
            related_id=tournament.id,
            tournament=tournament,
            action_url=f'/tournaments/{tournament.id}',
            priority='HIGH'
        )
        
        if notification:
            logger.info(f"[NOTIFICATION] ✓ Successfully sent TOURNAMENT_APPROVED notification")
            logger.info(f"[NOTIFICATION] Notification ID: {notification.id}")
            logger.info(f"[NOTIFICATION] Recipient: {tournament.organizer.full_name} ({tournament.organizer.email})")
        else:
            logger.error(f"[NOTIFICATION] ✗ send_notification returned None - notification may not have been created")
            
    except Exception as e:
        logger.error(f"[NOTIFICATION] ✗ Failed to send TOURNAMENT_APPROVED notification: {str(e)}")
        import traceback
        logger.error(f"[NOTIFICATION] Traceback: {traceback.format_exc()}")


def send_tournament_rejected_notification(tournament, admin_user, rejection_reason):
    """
    Send notification to organizer when tournament is rejected.
    
    Args:
        tournament: Tournament instance
        admin_user: CustomUser instance (admin who rejected)
        rejection_reason: String explaining why tournament was rejected
    
    Requirements: 15.2, 15.6
    """
    logger.info(f"[NOTIFICATION] Starting send_tournament_rejected_notification")
    logger.info(f"[NOTIFICATION] Tournament ID: {tournament.id}, Title: {tournament.title}")
    logger.info(f"[NOTIFICATION] Organizer ID: {tournament.organizer.id}, Name: {tournament.organizer.full_name}, Email: {tournament.organizer.email}")
    logger.info(f"[NOTIFICATION] Admin ID: {admin_user.id}, Name: {admin_user.full_name}")
    logger.info(f"[NOTIFICATION] Rejection Reason: {rejection_reason}")
    
    try:
        notification = send_notification(
            user=tournament.organizer,
            notification_type='TOURNAMENT_REJECTED',
            title='Tournament Rejected',
            message=f'Your tournament "{tournament.title}" has been rejected. '
                    f'Reason: {rejection_reason}',
            related_id=tournament.id,
            tournament=tournament,
            action_url=f'/tournaments/{tournament.id}',
            priority='HIGH'
        )
        
        if notification:
            logger.info(f"[NOTIFICATION] ✓ Successfully sent TOURNAMENT_REJECTED notification")
            logger.info(f"[NOTIFICATION] Notification ID: {notification.id}")
            logger.info(f"[NOTIFICATION] Recipient: {tournament.organizer.full_name} ({tournament.organizer.email})")
        else:
            logger.error(f"[NOTIFICATION] ✗ send_notification returned None - notification may not have been created")
            
    except Exception as e:
        logger.error(f"[NOTIFICATION] ✗ Failed to send TOURNAMENT_REJECTED notification: {str(e)}")
        import traceback
        logger.error(f"[NOTIFICATION] Traceback: {traceback.format_exc()}")


def send_venue_approved_notification(venue, admin_user):
    """
    Send notification to venue owner when venue is approved.
    
    Args:
        venue: Venue instance
        admin_user: CustomUser instance (admin who approved)
    
    Requirements: 15.3, 15.6
    """
    logger.info(f"[NOTIFICATION] Starting send_venue_approved_notification")
    logger.info(f"[NOTIFICATION] Venue ID: {venue.id}, Name: {venue.name}")
    logger.info(f"[NOTIFICATION] Owner ID: {venue.owner.id}, Name: {venue.owner.full_name}, Email: {venue.owner.email}")
    logger.info(f"[NOTIFICATION] Admin ID: {admin_user.id}, Name: {admin_user.full_name}")
    logger.info(f"[NOTIFICATION] Approval Date: {venue.approval_date}")
    
    try:
        notification = send_notification(
            user=venue.owner,
            notification_type='VENUE_APPROVED',
            title='Venue Approved',
            message=f'Your venue "{venue.name}" has been approved and is now available for bookings! '
                    f'Approved on {venue.approval_date.strftime("%B %d, %Y")}.',
            related_id=venue.id,
            action_url=f'/venues/{venue.id}',
            priority='HIGH'
        )
        
        if notification:
            logger.info(f"[NOTIFICATION] ✓ Successfully sent VENUE_APPROVED notification")
            logger.info(f"[NOTIFICATION] Notification ID: {notification.id}")
            logger.info(f"[NOTIFICATION] Recipient: {venue.owner.full_name} ({venue.owner.email})")
        else:
            logger.error(f"[NOTIFICATION] ✗ send_notification returned None - notification may not have been created")
            
    except Exception as e:
        logger.error(f"[NOTIFICATION] ✗ Failed to send VENUE_APPROVED notification: {str(e)}")
        import traceback
        logger.error(f"[NOTIFICATION] Traceback: {traceback.format_exc()}")


def send_venue_rejected_notification(venue, admin_user, rejection_reason):
    """
    Send notification to venue owner when venue is rejected.
    
    Args:
        venue: Venue instance
        admin_user: CustomUser instance (admin who rejected)
        rejection_reason: String explaining why venue was rejected
    
    Requirements: 15.4, 15.6
    """
    logger.info(f"[NOTIFICATION] Starting send_venue_rejected_notification")
    logger.info(f"[NOTIFICATION] Venue ID: {venue.id}, Name: {venue.name}")
    logger.info(f"[NOTIFICATION] Owner ID: {venue.owner.id}, Name: {venue.owner.full_name}, Email: {venue.owner.email}")
    logger.info(f"[NOTIFICATION] Admin ID: {admin_user.id}, Name: {admin_user.full_name}")
    logger.info(f"[NOTIFICATION] Rejection Reason: {rejection_reason}")
    
    try:
        notification = send_notification(
            user=venue.owner,
            notification_type='VENUE_REJECTED',
            title='Venue Rejected',
            message=f'Your venue "{venue.name}" has been rejected. '
                    f'Reason: {rejection_reason}',
            related_id=venue.id,
            action_url=f'/venues/{venue.id}',
            priority='HIGH'
        )
        
        if notification:
            logger.info(f"[NOTIFICATION] ✓ Successfully sent VENUE_REJECTED notification")
            logger.info(f"[NOTIFICATION] Notification ID: {notification.id}")
            logger.info(f"[NOTIFICATION] Recipient: {venue.owner.full_name} ({venue.owner.email})")
        else:
            logger.error(f"[NOTIFICATION] ✗ send_notification returned None - notification may not have been created")
            
    except Exception as e:
        logger.error(f"[NOTIFICATION] ✗ Failed to send VENUE_REJECTED notification: {str(e)}")
        import traceback
        logger.error(f"[NOTIFICATION] Traceback: {traceback.format_exc()}")


def send_documents_requested_notification(resource, resource_type, admin_user, requested_documents):
    """
    Send notification when conditional approval requires additional documents.
    
    Args:
        resource: Tournament or Venue instance
        resource_type: String ('tournament' or 'venue')
        admin_user: CustomUser instance (admin who requested documents)
        requested_documents: List of document types requested
    
    Requirements: 14.3, 15.5, 15.6
    """
    logger.info(f"[NOTIFICATION] Starting send_documents_requested_notification")
    logger.info(f"[NOTIFICATION] Resource Type: {resource_type}, Resource ID: {resource.id}")
    
    try:
        if resource_type == 'tournament':
            user = resource.organizer
            resource_name = resource.title
            action_url = f'/tournaments/{resource.id}'
            tournament = resource
        else:  # venue
            user = resource.owner
            resource_name = resource.name
            action_url = f'/venues/{resource.id}'
            tournament = None
        
        logger.info(f"[NOTIFICATION] User ID: {user.id}, Name: {user.full_name}, Email: {user.email}")
        logger.info(f"[NOTIFICATION] Admin ID: {admin_user.id}, Name: {admin_user.full_name}")
        logger.info(f"[NOTIFICATION] Requested Documents: {requested_documents}")
        
        # Format the list of requested documents
        docs_list = ', '.join(requested_documents)
        
        notification = send_notification(
            user=user,
            notification_type='DOCUMENTS_REQUESTED',
            title='Additional Documents Required',
            message=f'Your {resource_type} "{resource_name}" requires additional documentation for approval. '
                    f'Please upload the following: {docs_list}',
            related_id=resource.id,
            tournament=tournament,
            action_url=action_url,
            priority='HIGH'
        )
        
        if notification:
            logger.info(f"[NOTIFICATION] ✓ Successfully sent DOCUMENTS_REQUESTED notification")
            logger.info(f"[NOTIFICATION] Notification ID: {notification.id}")
            logger.info(f"[NOTIFICATION] Recipient: {user.full_name} ({user.email})")
        else:
            logger.error(f"[NOTIFICATION] ✗ send_notification returned None - notification may not have been created")
            
    except Exception as e:
        logger.error(f"[NOTIFICATION] ✗ Failed to send DOCUMENTS_REQUESTED notification: {str(e)}")
        import traceback
        logger.error(f"[NOTIFICATION] Traceback: {traceback.format_exc()}")
