"""
Tournament Validator Service

Provides sport-specific validation rules for team tournament registration.
Validates team composition, player eligibility, and tournament requirements.
"""

from typing import Dict, List, Any, Optional
from django.core.exceptions import ValidationError
from django.db.models import Q

from ..models import Team, TeamMembership, TeamTournamentRegistration
from tournaments.models import Tournament
from accounts.models import CustomUser


class ValidationResult:
    """Result object for validation operations"""
    
    def __init__(self, is_valid: bool = True, errors: Optional[List[str]] = None, warnings: Optional[List[str]] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.warnings = warnings or []
    
    def add_error(self, error: str):
        """Add an error and mark result as invalid"""
        self.errors.append(error)
        self.is_valid = False
    
    def add_warning(self, warning: str):
        """Add a warning (doesn't affect validity)"""
        self.warnings.append(warning)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'is_valid': self.is_valid,
            'errors': self.errors,
            'warnings': self.warnings
        }


class TournamentValidationError(Exception):
    """Custom exception for tournament validation errors"""
    pass


class TournamentValidator:
    """
    Service for validating team tournament registrations.
    
    Implements sport-specific validation rules:
    - Futsal: Exactly 5 players + optional substitutes
    - Badminton doubles: Exactly 2 players
    - Badminton singles: Individual registration (backward compatibility)
    """
    
    # Sport-specific requirements
    SPORT_REQUIREMENTS = {
        'FUTSAL': {
            'required_players': 5,
            'allows_substitutes': True,
            'max_substitutes': 10,  # Total team size 15 - 5 required = 10 max substitutes
            'registration_type': 'team'
        },
        'BADMINTON': {
            'doubles': {
                'required_players': 2,
                'allows_substitutes': False,
                'max_substitutes': 0,
                'registration_type': 'team'
            },
            'singles': {
                'required_players': 1,
                'allows_substitutes': False,
                'max_substitutes': 0,
                'registration_type': 'individual'
            }
        }
    }
    
    def validate_team_composition(self, team: Team, tournament: Tournament) -> ValidationResult:
        """
        Validate if a team's composition meets tournament requirements.
        
        Args:
            team: The team to validate
            tournament: The tournament to validate against
            
        Returns:
            ValidationResult with validation status and any errors/warnings
        """
        result = ValidationResult()
        
        # Check if team is active
        if not team.is_active:
            result.add_error("Team is not active")
            return result
        
        # Check sport compatibility
        sport_validation = self._validate_sport_compatibility(team, tournament)
        if not sport_validation.is_valid:
            result.errors.extend(sport_validation.errors)
            result.is_valid = False
        
        # Get sport requirements
        requirements = self._get_sport_requirements(tournament)
        if not requirements:
            result.add_error(f"Unsupported sport type: {tournament.sport_type}")
            return result
        
        # Check minimum team size
        active_members = team.memberships.filter(is_active=True).count()
        min_required = requirements['required_players']
        
        if active_members < min_required:
            result.add_error(
                f"Team has {active_members} active members but needs at least {min_required} for {tournament.sport_type}"
            )
        
        # Add warnings for optimal team composition
        if requirements.get('allows_substitutes') and active_members == min_required:
            result.add_warning(
                f"Team has minimum required players ({min_required}). Consider adding substitutes for better flexibility."
            )
        
        return result
    
    def validate_player_selection(self, players: List[CustomUser], tournament: Tournament, team: Team = None) -> ValidationResult:
        """
        Validate player selection for tournament registration.
        
        Args:
            players: List of selected players
            tournament: Tournament to validate against
            team: Team context (required for team tournaments)
            
        Returns:
            ValidationResult with validation status and any errors/warnings
        """
        result = ValidationResult()
        
        # Get sport requirements
        requirements = self._get_sport_requirements(tournament)
        if not requirements:
            result.add_error(f"Unsupported sport type: {tournament.sport_type}")
            return result
        
        # Validate player count
        player_count = len(players)
        required_count = requirements['required_players']
        max_allowed = required_count + requirements.get('max_substitutes', 0)
        
        if player_count < required_count:
            result.add_error(
                f"Selected {player_count} players but {tournament.sport_type} requires exactly {required_count}"
            )
        elif player_count > max_allowed:
            result.add_error(
                f"Selected {player_count} players but maximum allowed is {max_allowed} for {tournament.sport_type}"
            )
        
        # For team tournaments, validate team membership
        if requirements['registration_type'] == 'team' and team:
            membership_validation = self._validate_team_membership(players, team)
            if not membership_validation.is_valid:
                result.errors.extend(membership_validation.errors)
                result.is_valid = False
        
        # Validate player eligibility
        eligibility_validation = self._validate_player_eligibility(players, tournament)
        if not eligibility_validation.is_valid:
            result.errors.extend(eligibility_validation.errors)
            result.is_valid = False
        
        return result
    
    def check_player_eligibility(self, player_id: str, team_id: str) -> bool:
        """
        Check if a player is eligible for team tournament selection.
        
        Args:
            player_id: ID of the player to check
            team_id: ID of the team
            
        Returns:
            True if player is eligible, False otherwise
        """
        try:
            # Check if player is an active member of the team
            membership = TeamMembership.objects.get(
                team_id=team_id,
                player_id=player_id,
                is_active=True
            )
            return True
        except TeamMembership.DoesNotExist:
            return False
    
    def validate_registration_authority(self, user: CustomUser, team: Team) -> ValidationResult:
        """
        Validate if a user has authority to register a team for tournaments.
        
        Args:
            user: User attempting to register
            team: Team to register
            
        Returns:
            ValidationResult with validation status
        """
        result = ValidationResult()
        
        try:
            membership = TeamMembership.objects.get(
                team=team,
                player=user,
                is_active=True
            )
            
            if not membership.can_register_for_tournaments():
                result.add_error(
                    f"Only team owners and leaders can register teams for tournaments. "
                    f"Your role: {membership.get_role_display()}"
                )
        except TeamMembership.DoesNotExist:
            result.add_error("You are not a member of this team")
        
        return result
    
    def _validate_sport_compatibility(self, team: Team, tournament: Tournament) -> ValidationResult:
        """Validate if team supports the tournament's sport"""
        result = ValidationResult()
        
        tournament_sport = tournament.sport_type.upper()
        team_sports = [sport.upper() for sport in team.sport_types]
        
        if tournament_sport not in team_sports:
            result.add_error(
                f"Team supports {', '.join(team_sports)} but tournament requires {tournament_sport}"
            )
        
        return result
    
    def _get_sport_requirements(self, tournament: Tournament) -> Optional[Dict[str, Any]]:
        """Get sport-specific requirements for a tournament"""
        sport = tournament.sport_type.upper()
        
        if sport == 'FUTSAL':
            return self.SPORT_REQUIREMENTS['FUTSAL']
        elif sport == 'BADMINTON':
            # For badminton, we need to determine if it's singles or doubles
            # This could be determined by tournament configuration or naming convention
            # For now, assume doubles for team tournaments, singles for individual
            # This logic might need refinement based on actual tournament setup
            if hasattr(tournament, 'is_team_tournament') and tournament.is_team_tournament:
                return self.SPORT_REQUIREMENTS['BADMINTON']['doubles']
            else:
                # Check tournament title or description for hints
                title_lower = tournament.title.lower()
                if 'doubles' in title_lower:
                    return self.SPORT_REQUIREMENTS['BADMINTON']['doubles']
                elif 'singles' in title_lower:
                    return self.SPORT_REQUIREMENTS['BADMINTON']['singles']
                else:
                    # Default to doubles for team context
                    return self.SPORT_REQUIREMENTS['BADMINTON']['doubles']
        
        return None
    
    def _validate_team_membership(self, players: List[CustomUser], team: Team) -> ValidationResult:
        """Validate that all selected players are active team members"""
        result = ValidationResult()
        
        player_ids = [str(player.id) for player in players]
        active_memberships = TeamMembership.objects.filter(
            team=team,
            player_id__in=player_ids,
            is_active=True
        ).values_list('player_id', flat=True)
        
        active_member_ids = [str(member_id) for member_id in active_memberships]
        
        for player in players:
            if str(player.id) not in active_member_ids:
                result.add_error(f"Player {player.full_name} is not an active member of team {team.name}")
        
        return result
    
    def _validate_player_eligibility(self, players: List[CustomUser], tournament: Tournament) -> ValidationResult:
        """Validate general player eligibility for tournament"""
        result = ValidationResult()
        
        for player in players:
            # Check if player role is PLAYER
            if player.role != 'PLAYER':
                result.add_error(f"{player.full_name} is not a player (role: {player.get_role_display()})")
            
            # Check if player is active
            if not player.is_active:
                result.add_error(f"Player {player.full_name} is not active")
            
            # Check for conflicting registrations (if needed)
            # This could be expanded to check for time conflicts with other tournaments
        
        return result
    
    def get_validation_summary(self, team: Team, tournament: Tournament, selected_players: List[CustomUser] = None) -> Dict[str, Any]:
        """
        Get a comprehensive validation summary for team tournament registration.
        
        Args:
            team: Team to validate
            tournament: Tournament to validate against
            selected_players: Optional list of selected players
            
        Returns:
            Dictionary with validation results and requirements
        """
        requirements = self._get_sport_requirements(tournament)
        team_validation = self.validate_team_composition(team, tournament)
        
        summary = {
            'tournament': {
                'title': tournament.title,
                'sport_type': tournament.sport_type,
                'registration_deadline': tournament.registration_deadline,
            },
            'team': {
                'name': team.name,
                'sport_types': team.sport_types,
                'active_members': team.member_count,
            },
            'requirements': requirements,
            'team_validation': team_validation.to_dict(),
        }
        
        if selected_players:
            player_validation = self.validate_player_selection(selected_players, tournament, team)
            summary['player_validation'] = player_validation.to_dict()
            summary['selected_players'] = [
                {
                    'id': str(player.id),
                    'name': player.full_name,
                    'is_eligible': self.check_player_eligibility(str(player.id), str(team.id))
                }
                for player in selected_players
            ]
        
        return summary