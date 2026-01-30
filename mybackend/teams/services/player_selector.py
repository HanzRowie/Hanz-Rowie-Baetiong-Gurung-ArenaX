"""
Player Selector Service

Manages player selection for tournament registration.
Handles player eligibility checking and selection modification controls.
"""

from typing import List, Dict, Any, Optional
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from ..models import Team, TeamMembership, TeamTournamentRegistration
from tournaments.models import Tournament
from accounts.models import CustomUser
from .tournament_validator import TournamentValidator, ValidationResult


class PlayerSelectionError(Exception):
    """Custom exception for player selection errors"""
    pass


class PlayerSelection:
    """Represents a player selection for a tournament"""
    
    def __init__(self, selection_id: str, team_id: str, tournament_id: str, 
                 selected_players: List[CustomUser], registered_by: CustomUser,
                 created_at: timezone.datetime = None):
        self.selection_id = selection_id
        self.team_id = team_id
        self.tournament_id = tournament_id
        self.selected_players = selected_players
        self.registered_by = registered_by
        self.created_at = created_at or timezone.now()
    
    @property
    def player_count(self) -> int:
        """Get number of selected players"""
        return len(self.selected_players)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'selection_id': self.selection_id,
            'team_id': self.team_id,
            'tournament_id': self.tournament_id,
            'selected_players': [
                {
                    'id': str(player.id),
                    'name': player.full_name,
                    'email': player.email
                }
                for player in self.selected_players
            ],
            'registered_by': {
                'id': str(self.registered_by.id),
                'name': self.registered_by.full_name
            },
            'player_count': self.player_count,
            'created_at': self.created_at.isoformat()
        }


class PlayerSelector:
    """
    Service for managing player selection for tournament registration.
    
    Handles:
    - Player selection for tournaments
    - Selection validation and modification
    - Player eligibility checking
    - Authority validation for selection changes
    """
    
    def __init__(self):
        self.validator = TournamentValidator()
    
    def select_players_for_tournament(self, team_id: str, tournament_id: str, 
                                    player_ids: List[str], registered_by_id: str) -> PlayerSelection:
        """
        Select players for tournament registration.
        
        Args:
            team_id: ID of the team
            tournament_id: ID of the tournament
            player_ids: List of player IDs to select
            registered_by_id: ID of user making the selection
            
        Returns:
            PlayerSelection object with selection details
            
        Raises:
            PlayerSelectionError: If selection is invalid or unauthorized
        """
        try:
            # Get objects
            team = Team.objects.get(id=team_id, is_active=True)
            tournament = Tournament.objects.get(id=tournament_id)
            registered_by = CustomUser.objects.get(id=registered_by_id, role='PLAYER')
            players = CustomUser.objects.filter(id__in=player_ids, role='PLAYER', is_active=True)
            
            # Validate authority
            authority_validation = self.validator.validate_registration_authority(registered_by, team)
            if not authority_validation.is_valid:
                raise PlayerSelectionError(f"Unauthorized: {'; '.join(authority_validation.errors)}")
            
            # Validate tournament registration is still open
            if not tournament.is_registration_open:
                raise PlayerSelectionError("Tournament registration is closed")
            
            # Check if team is already registered
            existing_registration = TeamTournamentRegistration.objects.filter(
                team=team,
                tournament=tournament
            ).first()
            
            if existing_registration and existing_registration.status == 'CONFIRMED':
                raise PlayerSelectionError("Team is already registered for this tournament")
            
            # Validate player selection
            players_list = list(players)
            if len(players_list) != len(player_ids):
                missing_ids = set(player_ids) - {str(p.id) for p in players_list}
                raise PlayerSelectionError(f"Invalid player IDs: {', '.join(missing_ids)}")
            
            selection_validation = self.validator.validate_player_selection(players_list, tournament, team)
            if not selection_validation.is_valid:
                raise PlayerSelectionError(f"Invalid selection: {'; '.join(selection_validation.errors)}")
            
            # Create or update registration
            with transaction.atomic():
                registration, created = TeamTournamentRegistration.objects.get_or_create(
                    team=team,
                    tournament=tournament,
                    defaults={
                        'registered_by': registered_by,
                        'status': 'PENDING'
                    }
                )
                
                # Update selected players
                registration.selected_players.set(players_list)
                registration.registered_by = registered_by
                registration.save()
                
                # Create selection object
                selection = PlayerSelection(
                    selection_id=str(registration.id),
                    team_id=team_id,
                    tournament_id=tournament_id,
                    selected_players=players_list,
                    registered_by=registered_by,
                    created_at=registration.registered_at
                )
                
                return selection
                
        except (Team.DoesNotExist, Tournament.DoesNotExist, CustomUser.DoesNotExist) as e:
            raise PlayerSelectionError(f"Object not found: {str(e)}")
        except Exception as e:
            raise PlayerSelectionError(f"Selection failed: {str(e)}")
    
    def update_player_selection(self, selection_id: str, player_ids: List[str], 
                              updated_by_id: str) -> PlayerSelection:
        """
        Update player selection for an existing tournament registration.
        
        Args:
            selection_id: ID of the existing selection (registration ID)
            player_ids: New list of player IDs
            updated_by_id: ID of user making the update
            
        Returns:
            Updated PlayerSelection object
            
        Raises:
            PlayerSelectionError: If update is invalid or unauthorized
        """
        try:
            # Get registration
            registration = TeamTournamentRegistration.objects.get(id=selection_id)
            updated_by = CustomUser.objects.get(id=updated_by_id, role='PLAYER')
            
            # Check if tournament allows modifications
            if not registration.tournament.is_registration_open:
                raise PlayerSelectionError("Cannot modify selection - tournament registration is closed")
            
            # Check if tournament has started
            if registration.tournament.status != 'UPCOMING':
                raise PlayerSelectionError("Cannot modify selection - tournament has started")
            
            # Validate authority
            authority_validation = self.validator.validate_registration_authority(updated_by, registration.team)
            if not authority_validation.is_valid:
                raise PlayerSelectionError(f"Unauthorized: {'; '.join(authority_validation.errors)}")
            
            # Get new players
            players = CustomUser.objects.filter(id__in=player_ids, role='PLAYER', is_active=True)
            players_list = list(players)
            
            if len(players_list) != len(player_ids):
                missing_ids = set(player_ids) - {str(p.id) for p in players_list}
                raise PlayerSelectionError(f"Invalid player IDs: {', '.join(missing_ids)}")
            
            # Validate new selection
            selection_validation = self.validator.validate_player_selection(
                players_list, registration.tournament, registration.team
            )
            if not selection_validation.is_valid:
                raise PlayerSelectionError(f"Invalid selection: {'; '.join(selection_validation.errors)}")
            
            # Update selection
            with transaction.atomic():
                registration.selected_players.set(players_list)
                registration.save()
                
                # Create updated selection object
                selection = PlayerSelection(
                    selection_id=str(registration.id),
                    team_id=str(registration.team.id),
                    tournament_id=str(registration.tournament.id),
                    selected_players=players_list,
                    registered_by=registration.registered_by,
                    created_at=registration.registered_at
                )
                
                return selection
                
        except TeamTournamentRegistration.DoesNotExist:
            raise PlayerSelectionError("Selection not found")
        except CustomUser.DoesNotExist:
            raise PlayerSelectionError("User not found")
        except Exception as e:
            raise PlayerSelectionError(f"Update failed: {str(e)}")
    
    def get_available_players(self, team_id: str, tournament_id: str) -> List[Dict[str, Any]]:
        """
        Get list of players available for tournament selection.
        
        Args:
            team_id: ID of the team
            tournament_id: ID of the tournament
            
        Returns:
            List of available players with eligibility information
            
        Raises:
            PlayerSelectionError: If team or tournament not found
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            tournament = Tournament.objects.get(id=tournament_id)
            
            # Get all active team members
            memberships = TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).select_related('player')
            
            available_players = []
            for membership in memberships:
                player = membership.player
                
                # Check basic eligibility
                is_eligible = (
                    player.is_active and 
                    player.role == 'PLAYER' and
                    self.validator.check_player_eligibility(str(player.id), team_id)
                )
                
                # Additional checks could be added here (e.g., conflicting tournaments)
                
                player_info = {
                    'id': str(player.id),
                    'name': player.full_name,
                    'email': player.email,
                    'role_in_team': membership.get_role_display(),
                    'joined_at': membership.joined_at.isoformat(),
                    'is_eligible': is_eligible,
                    'eligibility_notes': [] if is_eligible else ['Player not eligible']
                }
                
                available_players.append(player_info)
            
            return available_players
            
        except (Team.DoesNotExist, Tournament.DoesNotExist) as e:
            raise PlayerSelectionError(f"Object not found: {str(e)}")
    
    def get_current_selection(self, team_id: str, tournament_id: str) -> Optional[PlayerSelection]:
        """
        Get current player selection for a team's tournament registration.
        
        Args:
            team_id: ID of the team
            tournament_id: ID of the tournament
            
        Returns:
            PlayerSelection object if exists, None otherwise
        """
        try:
            registration = TeamTournamentRegistration.objects.get(
                team_id=team_id,
                tournament_id=tournament_id
            )
            
            selected_players = list(registration.selected_players.all())
            
            return PlayerSelection(
                selection_id=str(registration.id),
                team_id=team_id,
                tournament_id=tournament_id,
                selected_players=selected_players,
                registered_by=registration.registered_by,
                created_at=registration.registered_at
            )
            
        except TeamTournamentRegistration.DoesNotExist:
            return None
    
    def can_modify_selection(self, selection_id: str, user_id: str) -> ValidationResult:
        """
        Check if a user can modify a player selection.
        
        Args:
            selection_id: ID of the selection
            user_id: ID of the user
            
        Returns:
            ValidationResult indicating if modification is allowed
        """
        result = ValidationResult()
        
        try:
            registration = TeamTournamentRegistration.objects.get(id=selection_id)
            user = CustomUser.objects.get(id=user_id)
            
            # Check tournament status
            if not registration.tournament.is_registration_open:
                result.add_error("Tournament registration is closed")
            
            if registration.tournament.status != 'UPCOMING':
                result.add_error("Tournament has already started")
            
            # Check user authority
            authority_validation = self.validator.validate_registration_authority(user, registration.team)
            if not authority_validation.is_valid:
                result.errors.extend(authority_validation.errors)
                result.is_valid = False
            
        except (TeamTournamentRegistration.DoesNotExist, CustomUser.DoesNotExist):
            result.add_error("Selection or user not found")
        
        return result
    
    def get_selection_summary(self, team_id: str, tournament_id: str) -> Dict[str, Any]:
        """
        Get comprehensive summary of player selection status.
        
        Args:
            team_id: ID of the team
            tournament_id: ID of the tournament
            
        Returns:
            Dictionary with selection summary and requirements
        """
        try:
            team = Team.objects.get(id=team_id, is_active=True)
            tournament = Tournament.objects.get(id=tournament_id)
            
            # Get validation summary from tournament validator
            validation_summary = self.validator.get_validation_summary(team, tournament)
            
            # Get current selection
            current_selection = self.get_current_selection(team_id, tournament_id)
            
            # Get available players
            available_players = self.get_available_players(team_id, tournament_id)
            
            summary = {
                **validation_summary,
                'current_selection': current_selection.to_dict() if current_selection else None,
                'available_players': available_players,
                'can_register': validation_summary['team_validation']['is_valid'],
                'registration_status': 'open' if tournament.is_registration_open else 'closed'
            }
            
            return summary
            
        except (Team.DoesNotExist, Tournament.DoesNotExist) as e:
            raise PlayerSelectionError(f"Object not found: {str(e)}")