from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from typing import List, Optional
from ..models import Team, TeamMembership, ActivityHistory
from accounts.models import CustomUser
from .team_manager import InsufficientPermissionsError


class InvalidRoleAssignmentError(Exception):
    """Raised when attempting invalid role assignments"""
    pass


class OwnershipTransferError(Exception):
    """Raised when ownership transfer fails"""
    pass


class RoleManager:
    """
    Service class for managing team roles and permissions.
    Handles role assignments, ownership transfers, and role-based validation.
    """

    @staticmethod
    def assign_role(team_id: str, player_id: str, role: str, assigned_by_id: str) -> TeamMembership:
        """
        Assign a role to a team member.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player to assign role to
            role: Role to assign ('OWNER', 'LEADER', 'MEMBER')
            assigned_by_id: UUID of the user performing the assignment
            
        Returns:
            TeamMembership: The updated membership with new role
            
        Raises:
            Team.DoesNotExist: If team not found
            ValidationError: If player or assigner not found
            InsufficientPermissionsError: If assigner lacks permissions
            InvalidRoleAssignmentError: If role assignment is invalid
        """
        # Validate inputs
        if role not in ['OWNER', 'LEADER', 'MEMBER']:
            raise InvalidRoleAssignmentError(f"Invalid role: {role}")

        try:
            team = Team.objects.get(id=team_id, is_active=True)
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
            assigned_by = CustomUser.objects.get(id=assigned_by_id, role='PLAYER')
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError("Player or assigner not found or not a player")

        # Get memberships
        player_membership = TeamMembership.objects.filter(
            team=team,
            player=player,
            is_active=True
        ).first()

        if not player_membership:
            raise ValidationError("Player is not an active member of this team")

        assigner_membership = TeamMembership.objects.filter(
            team=team,
            player=assigned_by,
            is_active=True
        ).first()

        if not assigner_membership:
            raise InsufficientPermissionsError("Assigner is not an active member of this team")

        # Validate permissions - only owners can assign roles
        if assigner_membership.role != 'OWNER':
            raise InsufficientPermissionsError("Only team owners can assign roles")

        # Prevent owner from changing their own role (use transfer_ownership instead)
        if player_membership.role == 'OWNER' and assigned_by == player:
            raise InvalidRoleAssignmentError("Use transfer_ownership to change ownership")

        # Prevent assigning OWNER role (use transfer_ownership instead)
        if role == 'OWNER':
            raise InvalidRoleAssignmentError("Use transfer_ownership to assign ownership")

        # Store old role for activity logging
        old_role = player_membership.role

        with transaction.atomic():
            # Update role
            player_membership.role = role
            player_membership.save()

            # Record activity
            ActivityHistory.objects.create(
                team=team,
                event_type='ROLE_CHANGED',
                description=f"{player.full_name}'s role changed from {old_role} to {role}",
                performed_by=assigned_by,
                metadata={
                    'player_name': player.full_name,
                    'player_id': str(player.id),
                    'old_role': old_role,
                    'new_role': role
                }
            )

        return player_membership

    @staticmethod
    def transfer_ownership(team_id: str, new_owner_id: str, current_owner_id: str) -> TeamMembership:
        """
        Transfer team ownership to another member.
        
        Args:
            team_id: UUID of the team
            new_owner_id: UUID of the player to become new owner
            current_owner_id: UUID of the current owner (for confirmation)
            
        Returns:
            TeamMembership: The new owner's membership
            
        Raises:
            Team.DoesNotExist: If team not found
            ValidationError: If players not found
            InsufficientPermissionsError: If current user is not owner
            OwnershipTransferError: If transfer is invalid
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            new_owner = CustomUser.objects.get(id=new_owner_id, role='PLAYER')
            current_owner = CustomUser.objects.get(id=current_owner_id, role='PLAYER')
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError("Player not found or not a player")

        # Get memberships
        current_owner_membership = TeamMembership.objects.filter(
            team=team,
            player=current_owner,
            role='OWNER',
            is_active=True
        ).first()

        if not current_owner_membership:
            raise InsufficientPermissionsError("Current user is not the team owner")

        new_owner_membership = TeamMembership.objects.filter(
            team=team,
            player=new_owner,
            is_active=True
        ).first()

        if not new_owner_membership:
            raise OwnershipTransferError("New owner must be an active team member")

        # Cannot transfer to self
        if current_owner == new_owner:
            raise OwnershipTransferError("Cannot transfer ownership to yourself")

        with transaction.atomic():
            # Update team owner reference
            team.owner = new_owner
            team.save()

            # Update memberships
            old_role = new_owner_membership.role
            new_owner_membership.role = 'OWNER'
            new_owner_membership.save()

            current_owner_membership.role = 'MEMBER'
            current_owner_membership.save()

            # Record activity
            ActivityHistory.objects.create(
                team=team,
                event_type='OWNERSHIP_TRANSFERRED',
                description=f"Team ownership transferred from {current_owner.full_name} to {new_owner.full_name}",
                performed_by=current_owner,
                metadata={
                    'previous_owner': current_owner.full_name,
                    'previous_owner_id': str(current_owner.id),
                    'new_owner': new_owner.full_name,
                    'new_owner_id': str(new_owner.id),
                    'new_owner_previous_role': old_role
                }
            )

        return new_owner_membership

    @staticmethod
    def get_player_role(team_id: str, player_id: str) -> Optional[str]:
        """
        Get a player's role in a specific team.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player
            
        Returns:
            Optional[str]: Player's role or None if not a member
        """
        try:
            membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=player_id,
                is_active=True
            )
            return membership.role
        except TeamMembership.DoesNotExist:
            return None

    @staticmethod
    def get_team_leaders(team_id: str) -> List[CustomUser]:
        """
        Get all leaders (including owner) of a team.
        
        Args:
            team_id: UUID of the team
            
        Returns:
            List[CustomUser]: List of players with OWNER or LEADER roles
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return []

        leader_memberships = TeamMembership.objects.filter(
            team=team,
            role__in=['OWNER', 'LEADER'],
            is_active=True
        ).select_related('player')

        return [membership.player for membership in leader_memberships]

    @staticmethod
    def can_register_for_tournaments(team_id: str, player_id: str) -> bool:
        """
        Check if a player can register the team for tournaments.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player
            
        Returns:
            bool: True if player can register team for tournaments
        """
        try:
            membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=player_id,
                is_active=True
            )
            return membership.can_register_for_tournaments()
        except TeamMembership.DoesNotExist:
            return False

    @staticmethod
    def can_assign_roles(team_id: str, player_id: str) -> bool:
        """
        Check if a player can assign roles to other team members.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player
            
        Returns:
            bool: True if player can assign roles
        """
        try:
            membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=player_id,
                is_active=True
            )
            return membership.can_assign_roles()
        except TeamMembership.DoesNotExist:
            return False

    @staticmethod
    def validate_role_assignment_permissions(team_id: str, assigner_id: str, target_player_id: str, new_role: str) -> bool:
        """
        Validate if a role assignment is permitted.
        
        Args:
            team_id: UUID of the team
            assigner_id: UUID of the user attempting to assign role
            target_player_id: UUID of the player receiving the role
            new_role: Role to be assigned
            
        Returns:
            bool: True if assignment is permitted
        """
        try:
            # Get assigner membership
            assigner_membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=assigner_id,
                is_active=True
            )

            # Get target player membership
            target_membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=target_player_id,
                is_active=True
            )

            # Only owners can assign roles
            if assigner_membership.role != 'OWNER':
                return False

            # Cannot assign OWNER role (must use transfer_ownership)
            if new_role == 'OWNER':
                return False

            # Cannot change own role from OWNER
            if (assigner_id == target_player_id and 
                assigner_membership.role == 'OWNER'):
                return False

            return True

        except TeamMembership.DoesNotExist:
            return False

    @staticmethod
    def validate_ownership_transfer_permissions(team_id: str, current_owner_id: str, new_owner_id: str) -> bool:
        """
        Validate if an ownership transfer is permitted.
        
        Args:
            team_id: UUID of the team
            current_owner_id: UUID of the current owner
            new_owner_id: UUID of the proposed new owner
            
        Returns:
            bool: True if transfer is permitted
        """
        try:
            # Verify current owner
            current_owner_membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=current_owner_id,
                role='OWNER',
                is_active=True
            )

            # Verify new owner is active member
            new_owner_membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=new_owner_id,
                is_active=True
            )

            # Cannot transfer to self
            if current_owner_id == new_owner_id:
                return False

            return True

        except TeamMembership.DoesNotExist:
            return False

    @staticmethod
    def get_team_members_by_role(team_id: str, role: str) -> List[CustomUser]:
        """
        Get all team members with a specific role.
        
        Args:
            team_id: UUID of the team
            role: Role to filter by ('OWNER', 'LEADER', 'MEMBER')
            
        Returns:
            List[CustomUser]: List of players with the specified role
        """
        if role not in ['OWNER', 'LEADER', 'MEMBER']:
            return []

        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return []

        memberships = TeamMembership.objects.filter(
            team=team,
            role=role,
            is_active=True
        ).select_related('player')

        return [membership.player for membership in memberships]

    @staticmethod
    def get_role_hierarchy_level(role: str) -> int:
        """
        Get the hierarchy level of a role (higher number = more authority).
        
        Args:
            role: Role to get level for
            
        Returns:
            int: Hierarchy level (3=OWNER, 2=LEADER, 1=MEMBER, 0=invalid)
        """
        role_levels = {
            'OWNER': 3,
            'LEADER': 2,
            'MEMBER': 1
        }
        return role_levels.get(role, 0)