"""
Signal handlers for venue approval workflow.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Venue
from notifications.utils import send_notification

User = get_user_model()


@receiver(pre_save, sender=Venue)
def notify_admin_on_document_upload(sender, instance, **kwargs):
    """
    Notify admins when venue owner uploads documents for conditional approval.
    
    This signal detects when verification_documents are updated for a venue
    with CONDITIONAL_APPROVAL status and sends notifications to all admin users.
    
    Requirements: 14.4
    """
    # Only process if this is an update (not a new venue)
    if not instance.pk:
        return
    
    try:
        # Get the old instance from database
        old_instance = Venue.objects.get(pk=instance.pk)
        
        # Check if venue has CONDITIONAL_APPROVAL status
        if instance.approval_status != 'CONDITIONAL_APPROVAL':
            return
        
        # Check if verification_documents have been updated
        old_docs = old_instance.verification_documents or {}
        new_docs = instance.verification_documents or {}
        
        # Compare document counts or keys to detect changes
        if len(new_docs) > len(old_docs) or set(new_docs.keys()) != set(old_docs.keys()):
            # Documents have been added/updated
            # Get all admin users
            admin_users = User.objects.filter(role='ADMIN')
            
            # Send notification to each admin
            for admin in admin_users:
                send_notification(
                    user=admin,
                    notification_type='GENERAL',
                    title='Documents Uploaded for Conditional Approval',
                    message=(
                        f'Venue owner {instance.owner.full_name} has uploaded documents for '
                        f'venue "{instance.name}" which is pending conditional approval. '
                        f'Please review the updated documents.'
                    ),
                    related_id=instance.id,
                    action_url=f'/admin/venues/{instance.id}',
                    priority='HIGH'
                )
    
    except Venue.DoesNotExist:
        # This shouldn't happen, but handle gracefully
        pass
