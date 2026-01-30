from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from typing import List, Optional, Dict, Any
from ..models import Team, TeamMembership, ActivityHistory
from accounts.models import CustomUser
from ..exceptions import (
    TeamSizeLimitError, DuplicateTeamNameError, InsufficientPermissionsError,
    TeamErrorMonitor, log_team_operation
)
from ..error_handlers import TeamOperationContext


class TeamManager:
    """
    Service class for managing team operations including creation, updates, and deletion.
    Implements team name uniqueness validation and team size limit enforcement.
    """

    @staticmethod
    def create_team(name: str, sport_types: List[str], owner_id: str) -> Team:
        """
        Create a new team with the specified name, sport types, and owner.
        
        Args:
            name: Team name (must be unique among active teams)
            sport_types: List of sports this team supports
            owner_id: UUID of the player who will own the team
            
        Returns:
            Team: The created team instance
            
        Raises:
            DuplicateTeamNameError: If team name already exists
            ValidationError: If owner is not a valid player
        """
        with TeamOperationContext('create_team', user_id=owner_id):
            # Validate owner exists and is a player
            try:
                owner = CustomUser.objects.get(id=owner_id, role='PLAYER')
            except CustomUser.DoesNotExist:
                raise ValidationError(f"Owner with ID {owner_id} not found or not a player")

            # Check for duplicate team names among active teams
            if Team.objects.filter(name=name, is_active=True).exists():
                raise DuplicateTeamNameError(name)

            # Validate sport types
            valid_sports = ['FUTSAL', 'BADMINTON']
            invalid_sports = [sport for sport in sport_types if sport not in valid_sports]
            if invalid_sports:
                raise ValidationError(f"Invalid sport types: {invalid_sports}")

            with transaction.atomic():
                # Create the team
                team = Team.objects.create(
                    name=name,
                    sport_types=sport_types,
                    owner=owner,
                    is_active=True
                )

                # Create owner membership
                TeamMembership.objects.create(
                    team=team,
                    player=owner,
                    role='OWNER',
                    is_active=True
                )

                # Record activity
                try:
                    ActivityHistory.objects.create(
                        team=team,
                        event_type='TEAM_CREATED',
                        description=f"Team '{name}' was created",
                        performed_by=owner,
                        metadata={
                            'sport_types': sport_types,
                            'initial_owner': owner.full_name
                        }
                    )
                except Exception as e:
                    # Log history recording error but don't fail the operation
                    TeamErrorMonitor.track_error(
                        Exception(f"Failed to record team creation history: {str(e)}"),
                        {'team_id': str(team.id), 'operation': 'create_team'}
                    )

                # Log successful operation
                log_team_operation(
                    operation='create_team',
                    team_id=str(team.id),
                    user_id=owner_id,
                    success=True,
                    details={'team_name': name, 'sport_types': sport_types}
                )

            return team

    @staticmethod
    def update_team(team_id: str, updates: Dict[str, Any], updated_by_id: str) -> Team:
        """
        Update team information.
        
        Args:
            team_id: UUID of the team to update
            updates: Dictionary of fields to update
            updated_by_id: UUID of the user performing the update
            
        Returns:
            Team: The updated team instance
            
        Raises:
            Team.DoesNotExist: If team not found
            InsufficientPermissionsError: If user lacks permissions
            DuplicateTeamNameError: If new name conflicts with existing team
        """
        with TeamOperationContext('update_team', team_id=team_id, user_id=updated_by_id):
            try:
                team = Team.objects.get(id=team_id, is_active=True)
                updated_by = CustomUser.objects.get(id=updated_by_id, role='PLAYER')
            except Team.DoesNotExist:
                raise Team.DoesNotExist(f"Team with ID {team_id} not found")
            except CustomUser.DoesNotExist:
                raise ValidationError(f"User with ID {updated_by_id} not found or not a player")

            # Check permissions - only owner can update team
            membership = TeamMembership.objects.filter(
                team=team, 
                player=updated_by, 
                role='OWNER', 
                is_active=True
            ).first()
            
            if not membership:
                raise InsufficientPermissionsError(
                    required_role='OWNER',
                    user_role=membership.role if membership else 'NON_MEMBER',
                    operation=f"update team '{team.name}'"
                )

            # Check for name conflicts if name is being updated
            if 'name' in updates and updates['name'] != team.name:
                if Team.objects.filter(name=updates['name'], is_active=True).exclude(id=team_id).exists():
                    raise DuplicateTeamNameError(updates['name'])

            # Validate sport types if being updated
            if 'sport_types' in updates:
                valid_sports = ['FUTSAL', 'BADMINTON']
                invalid_sports = [sport for sport in updates['sport_types'] if sport not in valid_sports]
                if invalid_sports:
                    raise ValidationError(f"Invalid sport types: {invalid_sports}")

            with transaction.atomic():
                # Apply updates
                for field, value in updates.items():
                    if hasattr(team, field):
                        setattr(team, field, value)
                
                team.updated_at = timezone.now()
                team.save()

                # Record activity
                try:
                    ActivityHistory.objects.create(
                        team=team,
                        event_type='TEAM_UPDATED',
                        description=f"Team information was updated",
                        performed_by=updated_by,
                        metadata={
                            'updated_fields': list(updates.keys()),
                            'updates': updates
                        }
                    )
                except Exception as e:
                    # Log history recording error but don't fail the operation
                    TeamErrorMonitor.track_error(
                        Exception(f"Failed to record team update history: {str(e)}"),
                        {'team_id': team_id, 'operation': 'update_team'}
                    )

                # Log successful operation
                log_team_operation(
                    operation='update_team',
                    team_id=team_id,
                    user_id=updated_by_id,
                    success=True,
                    details={'updated_fields': list(updates.keys())}
                )

            return team

    @staticmethod
    def delete_team(team_id: str, deleted_by_id: str) -> bool:
        """
        Delete (deactivate) a team.
        
        Args:
            team_id: UUID of the team to delete
            deleted_by_id: UUID of the user performing the deletion
            
        Returns:
            bool: True if deletion was successful
            
        Raises:
            Team.DoesNotExist: If team not found
            InsufficientPermissionsError: If user lacks permissions
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            deleted_by = CustomUser.objects.get(id=deleted_by_id, role='PLAYER')
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")
        except CustomUser.DoesNotExist:
            raise ValidationError(f"User with ID {deleted_by_id} not found or not a player")

        # Check permissions - only owner can delete team
        membership = TeamMembership.objects.filter(
            team=team, 
            player=deleted_by, 
            role='OWNER', 
            is_active=True
        ).first()
        
        if not membership:
            raise InsufficientPermissionsError("Only team owner can delete the team")

        with transaction.atomic():
            # Deactivate team and all memberships
            team.is_active = False
            team.save()

            TeamMembership.objects.filter(team=team).update(is_active=False)

            # Record activity
            ActivityHistory.objects.create(
                team=team,
                event_type='TEAM_DELETED',
                description=f"Team '{team.name}' was deleted",
                performed_by=deleted_by,
                metadata={
                    'deletion_reason': 'Owner requested deletion'
                }
            )

        return True

    @staticmethod
    def get_teams_by_player(player_id: str) -> List[Team]:
        """
        Get all active teams where the player is a member.
        
        Args:
            player_id: UUID of the player
            
        Returns:
            List[Team]: List of teams the player belongs to
        """
        try:
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
        except CustomUser.DoesNotExist:
            return []

        team_ids = TeamMembership.objects.filter(
            player=player,
            is_active=True
        ).values_list('team_id', flat=True)

        return list(Team.objects.filter(id__in=team_ids, is_active=True))

    @staticmethod
    def get_teams_by_sport(sport_type: str) -> List[Team]:
        """
        Get all active teams that support a specific sport.
        
        Args:
            sport_type: Sport type to filter by
            
        Returns:
            List[Team]: List of teams supporting the sport
        """
        if sport_type not in ['FUTSAL', 'BADMINTON']:
            return []

        # Use icontains for SQLite compatibility
        from django.db.models import Q
        return list(Team.objects.filter(
            Q(sport_types__icontains=sport_type),
            is_active=True
        ))

    @staticmethod
    def add_member(team_id: str, player_id: str, added_by_id: str) -> TeamMembership:
        """
        Add a new member to the team.
        
        Args:
            team_id: UUID of the team
            player_id: UUID of the player to add
            added_by_id: UUID of the user adding the member
            
        Returns:
            TeamMembership: The created membership
            
        Raises:
            TeamSizeLimitError: If team is at capacity
            InsufficientPermissionsError: If user lacks permissions
        """
        with TeamOperationContext('add_member', team_id=team_id, user_id=added_by_id):
            try:
                team = Team.objects.get(id=team_id, is_active=True)
                player = CustomUser.objects.get(id=player_id, role='PLAYER')
                added_by = CustomUser.objects.get(id=added_by_id, role='PLAYER')
            except (Team.DoesNotExist, CustomUser.DoesNotExist) as e:
                raise ValidationError(f"Invalid team or player: {e}")

            # Check permissions - only owner and leaders can add members
            adder_membership = TeamMembership.objects.filter(
                team=team,
                player=added_by,
                role__in=['OWNER', 'LEADER'],
                is_active=True
            ).first()

            if not adder_membership:
                raise InsufficientPermissionsError(
                    required_role='OWNER or LEADER',
                    user_role=adder_membership.role if adder_membership else 'NON_MEMBER',
                    operation=f"add members to team '{team.name}'"
                )

            # Check team size limit
            if not team.can_add_member():
                raise TeamSizeLimitError(
                    current_size=team.member_count,
                    max_size=team.max_size,
                    team_name=team.name
                )

            # Check if player is already a member
            existing_membership = TeamMembership.objects.filter(
                team=team,
                player=player
            ).first()

            if existing_membership:
                if existing_membership.is_active:
                    raise ValidationError("Player is already an active member of this team")
                else:
                    # Reactivate existing membership
                    existing_membership.is_active = True
                    existing_membership.save()
                    membership = existing_membership
            else:
                # Create new membership
                membership = TeamMembership.objects.create(
                    team=team,
                    player=player,
                    role='MEMBER',
                    is_active=True
                )

            # Record activity
            try:
                ActivityHistory.objects.create(
                    team=team,
                    event_type='MEMBER_ADDED',
                    description=f"{player.full_name} was added to the team",
                    performed_by=added_by,
                    metadata={
                        'added_player': player.full_name,
                        'added_player_id': str(player.id)
                    }
                )
            except Exception as e:
                # Log history recording error but don't fail the operation
                TeamErrorMonitor.track_error(
                    Exception(f"Failed to record member addition history: {str(e)}"),
                    {'team_id': team_id, 'operation': 'add_member'}
                )

            # Log successful operation
            log_team_operation(
                operation='add_member',
                team_id=team_id,
                user_id=added_by_id,
                success=True,
                details={'added_player': player.full_name, 'player_id': player_id}
            )

            return membership

    @staticmethod
    def validate_team_name_uniqueness(name: str, exclude_team_id: Optional[str] = None) -> bool:
        """
        Validate that a team name is unique among active teams.
        
        Args:
            name: Team name to validate
            exclude_team_id: Optional team ID to exclude from check (for updates)
            
        Returns:
            bool: True if name is unique, False otherwise
        """
        query = Team.objects.filter(name=name, is_active=True)
        if exclude_team_id:
            query = query.exclude(id=exclude_team_id)
        
        return not query.exists()

    @staticmethod
    def enforce_team_size_limit(team_id: str) -> bool:
        """
        Check if team is within size limits.
        
        Args:
            team_id: UUID of the team to check
            
        Returns:
            bool: True if within limits, False otherwise
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            return team.member_count <= team.max_size
        except Team.DoesNotExist:
            return False