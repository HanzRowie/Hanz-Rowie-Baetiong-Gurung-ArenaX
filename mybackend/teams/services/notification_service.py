from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from typing import Optional, Dict, Any
from accounts.models import Notification, CustomUser
from ..models import Team, Invitation


class TeamNotificationService:
    """
    Service for sending team-related notifications including invitations,
    membership changes, and team activities.
    """

    # Notification types for team-related activities
    TEAM_INVITATION_SENT = 'TEAM_INVITATION_SENT'
    TEAM_INVITATION_ACCEPTED = 'TEAM_INVITATION_ACCEPTED'
    TEAM_INVITATION_DECLINED = 'TEAM_INVITATION_DECLINED'
    TEAM_MEMBER_ADDED = 'TEAM_MEMBER_ADDED'
    TEAM_MEMBER_REMOVED = 'TEAM_MEMBER_REMOVED'
    TEAM_ROLE_CHANGED = 'TEAM_ROLE_CHANGED'

    @staticmethod
    def send_invitation_notification(invitation: Invitation) -> bool:
        """
        Send notification when a team invitation is sent.
        
        Args:
            invitation: The invitation instance
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Create in-app notification
            notification = Notification.objects.create(
                user=invitation.player,
                notification_type='GENERAL',  # Using existing type
                title=f"Team Invitation: {invitation.team.name}",
                message=f"{invitation.sender.full_name} has invited you to join the team '{invitation.team.name}' for {', '.join(invitation.team.sport_types)}.",
                related_id=invitation.id
            )

            # Send email notification if enabled
            TeamNotificationService._send_invitation_email(invitation)

            return True

        except Exception as e:
            print(f"Error sending invitation notification: {e}")
            return False

    @staticmethod
    def send_invitation_response_notification(invitation: Invitation, response: str) -> bool:
        """
        Send notification when a team invitation is responded to.
        
        Args:
            invitation: The invitation instance
            response: 'ACCEPTED' or 'DECLINED'
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Notify the sender and team leaders
            recipients = [invitation.sender]
            
            # Add team leaders to recipients (excluding the sender if they're already a leader)
            from ..models import TeamMembership
            leaders = TeamMembership.objects.filter(
                team=invitation.team,
                role__in=['OWNER', 'LEADER'],
                is_active=True
            ).exclude(player=invitation.sender).select_related('player')
            
            recipients.extend([membership.player for membership in leaders])

            action_text = "accepted" if response == 'ACCEPTED' else "declined"
            
            for recipient in recipients:
                Notification.objects.create(
                    user=recipient,
                    notification_type='GENERAL',
                    title=f"Invitation {action_text.title()}: {invitation.team.name}",
                    message=f"{invitation.player.full_name} has {action_text} the invitation to join '{invitation.team.name}'.",
                    related_id=invitation.id
                )

            # Send email notifications
            TeamNotificationService._send_response_email(invitation, response, recipients)

            return True

        except Exception as e:
            print(f"Error sending invitation response notification: {e}")
            return False

    @staticmethod
    def send_member_added_notification(team: Team, new_member: CustomUser, added_by: CustomUser) -> bool:
        """
        Send notification when a new member is added to the team.
        
        Args:
            team: The team instance
            new_member: The player who was added
            added_by: The player who added the new member
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Notify all team members except the new member and the person who added them
            from ..models import TeamMembership
            members = TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).exclude(
                player__in=[new_member, added_by]
            ).select_related('player')

            for membership in members:
                Notification.objects.create(
                    user=membership.player,
                    notification_type='GENERAL',
                    title=f"New Team Member: {team.name}",
                    message=f"{new_member.full_name} has joined the team '{team.name}'.",
                    related_id=team.id
                )

            # Notify the new member
            Notification.objects.create(
                user=new_member,
                notification_type='GENERAL',
                title=f"Welcome to {team.name}!",
                message=f"You have successfully joined the team '{team.name}' for {', '.join(team.sport_types)}.",
                related_id=team.id
            )

            return True

        except Exception as e:
            print(f"Error sending member added notification: {e}")
            return False

    @staticmethod
    def send_role_changed_notification(team: Team, member: CustomUser, new_role: str, changed_by: CustomUser) -> bool:
        """
        Send notification when a team member's role is changed.
        
        Args:
            team: The team instance
            member: The player whose role was changed
            new_role: The new role assigned
            changed_by: The player who made the change
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Notify the member whose role was changed
            role_display = new_role.title()
            Notification.objects.create(
                user=member,
                notification_type='GENERAL',
                title=f"Role Updated: {team.name}",
                message=f"Your role in team '{team.name}' has been changed to {role_display} by {changed_by.full_name}.",
                related_id=team.id
            )

            # Notify other team leaders if the change was significant
            if new_role in ['OWNER', 'LEADER']:
                from ..models import TeamMembership
                leaders = TeamMembership.objects.filter(
                    team=team,
                    role__in=['OWNER', 'LEADER'],
                    is_active=True
                ).exclude(
                    player__in=[member, changed_by]
                ).select_related('player')

                for leadership in leaders:
                    Notification.objects.create(
                        user=leadership.player,
                        notification_type='GENERAL',
                        title=f"Team Role Change: {team.name}",
                        message=f"{member.full_name} has been assigned the role of {role_display} in team '{team.name}'.",
                        related_id=team.id
                    )

            return True

        except Exception as e:
            print(f"Error sending role changed notification: {e}")
            return False

    @staticmethod
    def _send_invitation_email(invitation: Invitation) -> bool:
        """
        Send email notification for team invitation.
        
        Args:
            invitation: The invitation instance
            
        Returns:
            bool: True if email was sent successfully
        """
        try:
            if not settings.EMAIL_HOST:
                print("Email not configured, skipping email notification")
                return False

            subject = f"Team Invitation: {invitation.team.name}"
            
            # Create email context
            context = {
                'invitation': invitation,
                'team': invitation.team,
                'sender': invitation.sender,
                'player': invitation.player,
                'sports': ', '.join(invitation.team.sport_types),
                'expires_at': invitation.expires_at,
                'accept_url': f"{settings.FRONTEND_URL}/teams/invitations/{invitation.id}/accept",
                'decline_url': f"{settings.FRONTEND_URL}/teams/invitations/{invitation.id}/decline",
            }

            # Render email templates
            html_message = render_to_string('teams/invitation_email.html', context)
            plain_message = render_to_string('teams/invitation_email.txt', context)

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.player.email],
                html_message=html_message,
                fail_silently=False
            )

            return True

        except Exception as e:
            print(f"Error sending invitation email: {e}")
            return False

    @staticmethod
    def _send_response_email(invitation: Invitation, response: str, recipients: list) -> bool:
        """
        Send email notification for invitation response.
        
        Args:
            invitation: The invitation instance
            response: 'ACCEPTED' or 'DECLINED'
            recipients: List of users to notify
            
        Returns:
            bool: True if emails were sent successfully
        """
        try:
            if not settings.EMAIL_HOST or not recipients:
                return False

            action_text = "accepted" if response == 'ACCEPTED' else "declined"
            subject = f"Invitation {action_text.title()}: {invitation.team.name}"
            
            context = {
                'invitation': invitation,
                'team': invitation.team,
                'player': invitation.player,
                'response': response,
                'action_text': action_text,
                'sports': ', '.join(invitation.team.sport_types),
            }

            # Render email templates
            html_message = render_to_string('teams/invitation_response_email.html', context)
            plain_message = render_to_string('teams/invitation_response_email.txt', context)

            recipient_emails = [user.email for user in recipients if user.email]

            if recipient_emails:
                send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipient_emails,
                    html_message=html_message,
                    fail_silently=False
                )

            return True

        except Exception as e:
            print(f"Error sending response email: {e}")
            return False

    @staticmethod
    def send_team_tournament_notification(team: Team, tournament_title: str, action: str, registered_by: CustomUser) -> bool:
        """
        Send notification when team is registered for or removed from a tournament.
        
        Args:
            team: The team instance
            tournament_title: Title of the tournament
            action: 'registered' or 'withdrawn'
            registered_by: The player who performed the action
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            from ..models import TeamMembership
            members = TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).exclude(player=registered_by).select_related('player')

            action_text = "registered for" if action == 'registered' else "withdrawn from"
            
            for membership in members:
                Notification.objects.create(
                    user=membership.player,
                    notification_type='GENERAL',
                    title=f"Tournament {action.title()}: {tournament_title}",
                    message=f"Your team '{team.name}' has been {action_text} the tournament '{tournament_title}' by {registered_by.full_name}.",
                    related_id=team.id
                )

            return True

        except Exception as e:
            print(f"Error sending tournament notification: {e}")
            return False

    @staticmethod
    def send_invitation_expired_notification(invitation: Invitation) -> bool:
        """
        Send notification when an invitation expires.
        
        Args:
            invitation: The expired invitation instance
            
        Returns:
            bool: True if notification was sent successfully
        """
        try:
            # Notify the sender that their invitation expired
            Notification.objects.create(
                user=invitation.sender,
                notification_type='GENERAL',
                title=f"Invitation Expired: {invitation.team.name}",
                message=f"Your invitation to {invitation.player.full_name} to join '{invitation.team.name}' has expired.",
                related_id=invitation.id
            )

            return True

        except Exception as e:
            print(f"Error sending invitation expired notification: {e}")
            return False

    @staticmethod
    def get_team_notifications(user: CustomUser, team_id: Optional[str] = None) -> list:
        """
        Get team-related notifications for a user.
        
        Args:
            user: The user to get notifications for
            team_id: Optional team ID to filter notifications
            
        Returns:
            list: List of team-related notifications
        """
        try:
            notifications = Notification.objects.filter(
                user=user,
                notification_type='GENERAL'
            ).order_by('-created_at')

            # Filter by team if specified
            if team_id:
                notifications = notifications.filter(related_id=team_id)

            # Filter for team-related notifications by checking message content
            team_notifications = []
            for notification in notifications:
                if any(keyword in notification.message.lower() for keyword in 
                      ['team', 'invitation', 'joined', 'role', 'tournament']):
                    team_notifications.append(notification)

            return team_notifications

        except Exception as e:
            print(f"Error getting team notifications: {e}")
            return []