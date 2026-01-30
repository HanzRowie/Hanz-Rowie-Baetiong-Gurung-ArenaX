from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from typing import List, Optional, Dict, Any
from ..models import Team, TeamMembership, Invitation, ActivityHistory
from accounts.models import CustomUser
from .notification_service import TeamNotificationService


class InvitationError(Exception):
    """Base exception for invitation-related errors"""
    pass


class InvitationAlreadyExistsError(InvitationError):
    """Raised when an invitation already exists for the player and team"""
    pass


class InvitationExpiredError(InvitationError):
    """Raised when attempting to respond to an expired invitation"""
    pass


class InsufficientPermissionsError(InvitationError):
    """Raised when user lacks permissions for the operation"""
    pass


class TeamFullError(InvitationError):
    """Raised when team is at maximum capacity"""
    pass


class InvitationManager:
    """
    Service class for managing team invitations including sending, responding,
    status tracking, and automatic expiration logic.
    """

    @staticmethod
    def send_invitation(team_id: str, player_id: str, sender_id: str) -> Invitation:
        """
        Send an invitation to a player to join a team.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player to invite
            sender_id: UUID of the user sending the invitation
            
        Returns:
            Invitation: The created invitation instance
            
        Raises:
            InvitationAlreadyExistsError: If invitation already exists
            InsufficientPermissionsError: If sender lacks permissions
            TeamFullError: If team is at maximum capacity
            ValidationError: If team, player, or sender not found
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
            sender = CustomUser.objects.get(id=sender_id, role='PLAYER')
        except Team.DoesNotExist:
            raise ValidationError(f"Team with ID {team_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError("Player or sender not found")

        # Check if sender has permission to send invitations (owner or leader)
        sender_membership = TeamMembership.objects.filter(
            team=team,
            player=sender,
            role__in=['OWNER', 'LEADER'],
            is_active=True
        ).first()

        if not sender_membership:
            raise InsufficientPermissionsError("Only team owners and leaders can send invitations")

        # Check if team can accept new members
        if not team.can_add_member():
            raise TeamFullError(f"Team has reached maximum size of {team.max_size} members")

        # Check if player is already a team member
        existing_membership = TeamMembership.objects.filter(
            team=team,
            player=player,
            is_active=True
        ).first()

        if existing_membership:
            raise ValidationError("Player is already a member of this team")

        # Check if there's already a pending invitation
        existing_invitation = Invitation.objects.filter(
            team=team,
            player=player,
            status='PENDING'
        ).first()

        if existing_invitation:
            # Check if it's expired and update if needed
            if existing_invitation.expire_if_needed():
                # Invitation was expired, we can create a new one
                pass
            else:
                raise InvitationAlreadyExistsError("Pending invitation already exists for this player")

        with transaction.atomic():
            # Create the invitation
            invitation = Invitation.objects.create(
                team=team,
                player=player,
                sender=sender,
                status='PENDING',
                expires_at=timezone.now() + timedelta(days=7)
            )

            # Record activity
            ActivityHistory.objects.create(
                team=team,
                event_type='INVITATION_SENT',
                description=f"Invitation sent to {player.full_name}",
                performed_by=sender,
                metadata={
                    'invited_player': player.full_name,
                    'invited_player_id': str(player.id),
                    'invitation_id': str(invitation.id)
                }
            )

            # Send notification
            TeamNotificationService.send_invitation_notification(invitation)

        return invitation

    @staticmethod
    def respond_to_invitation(invitation_id: str, response: str, player_id: str) -> bool:
        """
        Respond to a team invitation (accept or decline).
        
        Args:
            invitation_id: UUID of the invitation
            response: 'ACCEPTED' or 'DECLINED'
            player_id: UUID of the player responding
            
        Returns:
            bool: True if response was processed successfully
            
        Raises:
            Invitation.DoesNotExist: If invitation not found
            InvitationExpiredError: If invitation has expired
            ValidationError: If response is invalid or player mismatch
        """
        if response not in ['ACCEPTED', 'DECLINED']:
            raise ValidationError("Response must be 'ACCEPTED' or 'DECLINED'")

        try:
            invitation = Invitation.objects.get(id=invitation_id)
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
        except Invitation.DoesNotExist:
            raise Invitation.DoesNotExist(f"Invitation with ID {invitation_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError(f"Player with ID {player_id} not found")

        # Verify the invitation is for this player
        if invitation.player != player:
            raise ValidationError("Invitation is not for this player")

        # Check if invitation can still be responded to
        if not invitation.can_respond():
            if invitation.is_expired():
                raise InvitationExpiredError("Invitation has expired")
            else:
                raise ValidationError(f"Invitation cannot be responded to (status: {invitation.status})")

        # Check team capacity first if accepting
        if response == 'ACCEPTED' and not invitation.team.can_add_member():
            # Team became full after invitation was sent
            invitation.status = 'DECLINED'
            invitation.responded_at = timezone.now()
            invitation.save()
            raise TeamFullError("Team is now at maximum capacity")

        with transaction.atomic():
            # Update invitation status
            invitation.status = response
            invitation.responded_at = timezone.now()
            invitation.save()

            # If accepted, add player to team
            if response == 'ACCEPTED':
                # Create team membership
                TeamMembership.objects.create(
                    team=invitation.team,
                    player=player,
                    role='MEMBER',
                    is_active=True
                )

                # Record activity for acceptance
                ActivityHistory.objects.create(
                    team=invitation.team,
                    event_type='INVITATION_ACCEPTED',
                    description=f"{player.full_name} accepted invitation and joined the team",
                    performed_by=player,
                    metadata={
                        'invitation_id': str(invitation.id),
                        'sender': invitation.sender.full_name
                    }
                )

                # Also record member added activity
                ActivityHistory.objects.create(
                    team=invitation.team,
                    event_type='MEMBER_ADDED',
                    description=f"{player.full_name} joined the team via invitation",
                    performed_by=player,
                    metadata={
                        'added_via_invitation': True,
                        'invitation_id': str(invitation.id)
                    }
                )

            else:  # DECLINED
                # Record activity for decline
                ActivityHistory.objects.create(
                    team=invitation.team,
                    event_type='INVITATION_DECLINED',
                    description=f"{player.full_name} declined invitation to join the team",
                    performed_by=player,
                    metadata={
                        'invitation_id': str(invitation.id),
                        'sender': invitation.sender.full_name
                    }
                )

            # Send notification about the response
            TeamNotificationService.send_invitation_response_notification(invitation, response)

        return True

    @staticmethod
    def get_pending_invitations(player_id: str) -> List[Invitation]:
        """
        Get all pending invitations for a player.
        
        Args:
            player_id: UUID of the player
            
        Returns:
            List[Invitation]: List of pending invitations
        """
        try:
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
        except CustomUser.DoesNotExist:
            return []

        # Get pending invitations and check for expiration
        invitations = list(Invitation.objects.filter(
            player=player,
            status='PENDING'
        ).select_related('team', 'sender'))

        # Check and update expired invitations
        for invitation in invitations[:]:  # Create a copy to iterate over
            if invitation.expire_if_needed():
                invitations.remove(invitation)

        return invitations

    @staticmethod
    def get_team_invitations(team_id: str, status: Optional[str] = None) -> List[Invitation]:
        """
        Get invitations for a specific team.
        
        Args:
            team_id: UUID of the team
            status: Optional status filter ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')
            
        Returns:
            List[Invitation]: List of invitations for the team
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return []

        query = Invitation.objects.filter(team=team).select_related('player', 'sender')
        
        if status:
            query = query.filter(status=status)

        invitations = list(query.order_by('-sent_at'))

        # Update expired invitations if checking pending
        if not status or status == 'PENDING':
            for invitation in invitations:
                invitation.expire_if_needed()

        return invitations

    @staticmethod
    def expire_invitations() -> int:
        """
        Expire all invitations that have passed their expiration date.
        This method should be called periodically (e.g., via a cron job).
        
        Returns:
            int: Number of invitations that were expired
        """
        expired_count = 0
        
        # Get all pending invitations that should be expired
        pending_invitations = Invitation.objects.filter(
            status='PENDING',
            expires_at__lt=timezone.now()
        )

        with transaction.atomic():
            for invitation in pending_invitations:
                invitation.status = 'EXPIRED'
                invitation.save()
                expired_count += 1

                # Record activity for expiration
                ActivityHistory.objects.create(
                    team=invitation.team,
                    event_type='INVITATION_EXPIRED',
                    description=f"Invitation to {invitation.player.full_name} expired",
                    performed_by=None,  # System action
                    metadata={
                        'invitation_id': str(invitation.id),
                        'sender': invitation.sender.full_name,
                        'expired_at': timezone.now().isoformat()
                    }
                )

                # Send expiration notification
                TeamNotificationService.send_invitation_expired_notification(invitation)

        return expired_count

    @staticmethod
    def cancel_invitation(invitation_id: str, cancelled_by_id: str) -> bool:
        """
        Cancel a pending invitation.
        
        Args:
            invitation_id: UUID of the invitation to cancel
            cancelled_by_id: UUID of the user cancelling the invitation
            
        Returns:
            bool: True if cancellation was successful
            
        Raises:
            Invitation.DoesNotExist: If invitation not found
            InsufficientPermissionsError: If user lacks permissions
            ValidationError: If invitation cannot be cancelled
        """
        try:
            invitation = Invitation.objects.get(id=invitation_id)
            cancelled_by = CustomUser.objects.get(id=cancelled_by_id, role='PLAYER')
        except Invitation.DoesNotExist:
            raise Invitation.DoesNotExist(f"Invitation with ID {invitation_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError(f"User with ID {cancelled_by_id} not found")

        # Check if invitation can be cancelled
        if invitation.status != 'PENDING':
            raise ValidationError(f"Cannot cancel invitation with status: {invitation.status}")

        # Check permissions - only sender or team owner/leader can cancel
        can_cancel = False
        
        if invitation.sender == cancelled_by:
            can_cancel = True
        else:
            # Check if user is team owner or leader
            membership = TeamMembership.objects.filter(
                team=invitation.team,
                player=cancelled_by,
                role__in=['OWNER', 'LEADER'],
                is_active=True
            ).first()
            
            if membership:
                can_cancel = True

        if not can_cancel:
            raise InsufficientPermissionsError("Only invitation sender or team leaders can cancel invitations")

        with transaction.atomic():
            # Update invitation status
            invitation.status = 'CANCELLED'
            invitation.responded_at = timezone.now()
            invitation.save()

            # Record activity
            ActivityHistory.objects.create(
                team=invitation.team,
                event_type='INVITATION_CANCELLED',
                description=f"Invitation to {invitation.player.full_name} was cancelled",
                performed_by=cancelled_by,
                metadata={
                    'invitation_id': str(invitation.id),
                    'original_sender': invitation.sender.full_name,
                    'cancelled_by': cancelled_by.full_name
                }
            )

        return True

    @staticmethod
    def get_invitation_status(invitation_id: str) -> Dict[str, Any]:
        """
        Get detailed status information for an invitation.
        
        Args:
            invitation_id: UUID of the invitation
            
        Returns:
            Dict[str, Any]: Invitation status information
            
        Raises:
            Invitation.DoesNotExist: If invitation not found
        """
        try:
            invitation = Invitation.objects.select_related(
                'team', 'player', 'sender'
            ).get(id=invitation_id)
        except Invitation.DoesNotExist:
            raise Invitation.DoesNotExist(f"Invitation with ID {invitation_id} not found")

        # Check and update expiration if needed
        invitation.expire_if_needed()

        return {
            'id': str(invitation.id),
            'team': {
                'id': str(invitation.team.id),
                'name': invitation.team.name,
                'sport_types': invitation.team.sport_types
            },
            'player': {
                'id': str(invitation.player.id),
                'name': invitation.player.full_name,
                'email': invitation.player.email
            },
            'sender': {
                'id': str(invitation.sender.id),
                'name': invitation.sender.full_name
            },
            'status': invitation.status,
            'sent_at': invitation.sent_at,
            'responded_at': invitation.responded_at,
            'expires_at': invitation.expires_at,
            'is_expired': invitation.is_expired(),
            'can_respond': invitation.can_respond()
        }