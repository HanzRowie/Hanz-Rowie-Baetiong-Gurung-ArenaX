"""
Signal handlers for automatic relationship and group chat creation
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from referees.models import RefereeBooking
from teams.models import Team
from .models import RefereeOrganizerRelationship, GroupChat


@receiver(post_save, sender=RefereeBooking)
def create_referee_organizer_relationship(sender, instance, created, **kwargs):
    """
    Automatically create RefereeOrganizerRelationship when RefereeBooking is created.
    This enables bidirectional messaging between referee and organizer.
    """
    if created:
        RefereeOrganizerRelationship.objects.get_or_create(
            referee=instance.referee,
            organizer=instance.requested_by
        )


@receiver(post_save, sender=Team)
def create_group_chat_for_team(sender, instance, created, **kwargs):
    """
    Automatically create GroupChat when Team is created.
    This ensures every team has a group chat from the start.
    """
    if created:
        GroupChat.objects.get_or_create(team=instance)
