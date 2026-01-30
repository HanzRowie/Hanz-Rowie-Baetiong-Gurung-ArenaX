"""
Comprehensive Error Handling for Team-Based Tournament System

This module defines all error types specified in the design document and provides
centralized error handling with proper logging and monitoring capabilities.
"""

import logging
from typing import Dict, Any, Optional
from django.core.exceptions import ValidationError as DjangoValidationError


# Configure logger for team operations
logger = logging.getLogger('teams')


class TeamBaseException(Exception):
    """Base exception for all team-related errors"""
    
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            'error_code': self.error_code,
            'message': self.message,
            'details': self.details
        }
    
    def log_error(self, context: Dict[str, Any] = None):
        """Log the error with context information"""
        log_data = {
            'error_type': self.__class__.__name__,
            'error_code': self.error_code,
            'error_message': self.message,  # Changed from 'message' to 'error_message'
            'details': self.details
        }
        if context:
            log_data['context'] = context
        
        logger.error(f"Team operation error: {self.message}", extra=log_data)


# Team Management Errors

class DuplicateTeamNameError(TeamBaseException):
    """Raised when attempting to create a team with an existing name in the same sport"""
    
    def __init__(self, team_name: str, sport_type: str = None):
        message = f"Team with name '{team_name}' already exists"
        if sport_type:
            message += f" in {sport_type}"
        
        details = {
            'team_name': team_name,
            'sport_type': sport_type,
            'suggestion': 'Please choose a different team name'
        }
        
        super().__init__(message, 'DUPLICATE_TEAM_NAME', details)


class TeamSizeLimitError(TeamBaseException):
    """Raised when attempting to add members beyond the team size limit"""
    
    def __init__(self, current_size: int, max_size: int, team_name: str = None):
        message = f"Team has reached maximum size of {max_size} members (current: {current_size})"
        if team_name:
            message = f"Team '{team_name}' " + message.lower()
        
        details = {
            'current_size': current_size,
            'max_size': max_size,
            'team_name': team_name,
            'suggestion': 'Remove inactive members or increase team size limit'
        }
        
        super().__init__(message, 'TEAM_SIZE_LIMIT_EXCEEDED', details)


class InsufficientPermissionsError(TeamBaseException):
    """Raised when user lacks permissions for the operation"""
    
    def __init__(self, required_role: str, user_role: str = None, operation: str = None):
        message = f"Operation requires {required_role} role"
        if user_role:
            message += f" (current role: {user_role})"
        if operation:
            message = f"Cannot {operation}: " + message.lower()
        
        details = {
            'required_role': required_role,
            'user_role': user_role,
            'operation': operation,
            'suggestion': 'Contact team owner or leader for assistance'
        }
        
        super().__init__(message, 'INSUFFICIENT_PERMISSIONS', details)


class InvalidOwnershipTransferError(TeamBaseException):
    """Raised when ownership transfer lacks proper authorization or is invalid"""
    
    def __init__(self, reason: str, current_owner: str = None, new_owner: str = None):
        message = f"Ownership transfer failed: {reason}"
        
        details = {
            'reason': reason,
            'current_owner': current_owner,
            'new_owner': new_owner,
            'suggestion': 'Ensure new owner is an active team member and current owner confirms transfer'
        }
        
        super().__init__(message, 'INVALID_OWNERSHIP_TRANSFER', details)


# Tournament Registration Errors

class InvalidTeamCompositionError(TeamBaseException):
    """Raised when team composition doesn't meet tournament requirements"""
    
    def __init__(self, sport_type: str, required_players: int, current_players: int, 
                 allows_substitutes: bool = False, max_substitutes: int = 0):
        message = f"{sport_type} tournament requires {required_players} players"
        if allows_substitutes:
            message += f" (+ up to {max_substitutes} substitutes)"
        message += f", but team has {current_players} active members"
        
        details = {
            'sport_type': sport_type,
            'required_players': required_players,
            'current_players': current_players,
            'allows_substitutes': allows_substitutes,
            'max_substitutes': max_substitutes,
            'suggestion': 'Add more players to meet tournament requirements'
        }
        
        super().__init__(message, 'INVALID_TEAM_COMPOSITION', details)


class IneligiblePlayerError(TeamBaseException):
    """Raised when attempting to select non-members or inactive players"""
    
    def __init__(self, player_name: str, team_name: str, reason: str = None):
        message = f"Player '{player_name}' is not eligible for team '{team_name}'"
        if reason:
            message += f": {reason}"
        
        details = {
            'player_name': player_name,
            'team_name': team_name,
            'reason': reason,
            'suggestion': 'Select only active team members for tournament participation'
        }
        
        super().__init__(message, 'INELIGIBLE_PLAYER', details)


class RegistrationDeadlineError(TeamBaseException):
    """Raised when attempting to register after deadline"""
    
    def __init__(self, tournament_name: str, deadline: str):
        message = f"Registration deadline for '{tournament_name}' has passed (deadline: {deadline})"
        
        details = {
            'tournament_name': tournament_name,
            'deadline': deadline,
            'suggestion': 'Look for other upcoming tournaments'
        }
        
        super().__init__(message, 'REGISTRATION_DEADLINE_PASSED', details)


class ConflictingRegistrationError(TeamBaseException):
    """Raised when player/team is already registered for conflicting tournaments"""
    
    def __init__(self, entity_name: str, entity_type: str, conflicting_tournament: str, 
                 tournament_date: str = None):
        message = f"{entity_type} '{entity_name}' is already registered for '{conflicting_tournament}'"
        if tournament_date:
            message += f" on {tournament_date}"
        
        details = {
            'entity_name': entity_name,
            'entity_type': entity_type,
            'conflicting_tournament': conflicting_tournament,
            'tournament_date': tournament_date,
            'suggestion': 'Cancel existing registration or choose a different tournament'
        }
        
        super().__init__(message, 'CONFLICTING_REGISTRATION', details)


# Match Scoring Errors

class InvalidScoreError(TeamBaseException):
    """Raised when scores violate sport-specific rules"""
    
    def __init__(self, sport_type: str, violation: str, provided_score: Any = None):
        message = f"Invalid {sport_type} score: {violation}"
        
        details = {
            'sport_type': sport_type,
            'violation': violation,
            'provided_score': provided_score,
            'suggestion': f'Follow official {sport_type} scoring rules'
        }
        
        super().__init__(message, 'INVALID_SCORE', details)


class MatchNotFoundError(TeamBaseException):
    """Raised when attempting to score non-existent matches"""
    
    def __init__(self, match_id: str):
        message = f"Match with ID '{match_id}' not found"
        
        details = {
            'match_id': match_id,
            'suggestion': 'Verify the match ID and ensure the match exists'
        }
        
        super().__init__(message, 'MATCH_NOT_FOUND', details)


class UnauthorizedScoringError(TeamBaseException):
    """Raised when non-authorized users attempt to update scores"""
    
    def __init__(self, user_role: str, tournament_name: str = None):
        message = f"Only tournament organizers can record match scores (current role: {user_role})"
        if tournament_name:
            message = f"Cannot score matches for '{tournament_name}': " + message.lower()
        
        details = {
            'user_role': user_role,
            'tournament_name': tournament_name,
            'required_role': 'ORGANIZER',
            'suggestion': 'Contact the tournament organizer to record scores'
        }
        
        super().__init__(message, 'UNAUTHORIZED_SCORING', details)


class MatchAlreadyScoredError(TeamBaseException):
    """Raised when attempting to update scores for completed matches"""
    
    def __init__(self, match_id: str, current_status: str):
        message = f"Cannot update scores for completed match (status: {current_status})"
        
        details = {
            'match_id': match_id,
            'current_status': current_status,
            'suggestion': 'Contact system administrator if score correction is needed'
        }
        
        super().__init__(message, 'MATCH_ALREADY_SCORED', details)


# Data Consistency Errors

class StatisticsCalculationError(TeamBaseException):
    """Raised when statistics aggregation fails"""
    
    def __init__(self, entity_type: str, entity_id: str, calculation_type: str, error_details: str = None):
        message = f"Failed to calculate {calculation_type} statistics for {entity_type} '{entity_id}'"
        if error_details:
            message += f": {error_details}"
        
        details = {
            'entity_type': entity_type,
            'entity_id': entity_id,
            'calculation_type': calculation_type,
            'error_details': error_details,
            'suggestion': 'Try again later or contact support if problem persists'
        }
        
        super().__init__(message, 'STATISTICS_CALCULATION_ERROR', details)


class HistoryRecordingError(TeamBaseException):
    """Raised when activity history recording fails"""
    
    def __init__(self, event_type: str, team_id: str, error_details: str = None):
        message = f"Failed to record {event_type} activity for team '{team_id}'"
        if error_details:
            message += f": {error_details}"
        
        details = {
            'event_type': event_type,
            'team_id': team_id,
            'error_details': error_details,
            'suggestion': 'Operation completed but history may be incomplete'
        }
        
        super().__init__(message, 'HISTORY_RECORDING_ERROR', details)


class InvitationStateError(TeamBaseException):
    """Raised when invitation state transitions are invalid"""
    
    def __init__(self, current_state: str, attempted_transition: str, invitation_id: str = None):
        message = f"Cannot transition invitation from '{current_state}' to '{attempted_transition}'"
        
        details = {
            'current_state': current_state,
            'attempted_transition': attempted_transition,
            'invitation_id': invitation_id,
            'valid_transitions': self._get_valid_transitions(current_state),
            'suggestion': 'Check invitation status before attempting to modify it'
        }
        
        super().__init__(message, 'INVALID_INVITATION_STATE', details)
    
    def _get_valid_transitions(self, current_state: str) -> list:
        """Get valid state transitions for current invitation state"""
        transitions = {
            'PENDING': ['ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'],
            'ACCEPTED': [],
            'DECLINED': [],
            'EXPIRED': [],
            'CANCELLED': []
        }
        return transitions.get(current_state, [])


# Invitation-specific Errors

class InvitationAlreadyExistsError(TeamBaseException):
    """Raised when an invitation already exists for the player and team"""
    
    def __init__(self, player_name: str, team_name: str):
        message = f"Pending invitation already exists for '{player_name}' to join '{team_name}'"
        
        details = {
            'player_name': player_name,
            'team_name': team_name,
            'suggestion': 'Wait for player to respond or cancel existing invitation first'
        }
        
        super().__init__(message, 'INVITATION_ALREADY_EXISTS', details)


class InvitationExpiredError(TeamBaseException):
    """Raised when attempting to respond to an expired invitation"""
    
    def __init__(self, invitation_id: str, expired_date: str = None):
        message = "Invitation has expired and cannot be responded to"
        if expired_date:
            message += f" (expired on: {expired_date})"
        
        details = {
            'invitation_id': invitation_id,
            'expired_date': expired_date,
            'suggestion': 'Request a new invitation from the team'
        }
        
        super().__init__(message, 'INVITATION_EXPIRED', details)


class TeamFullError(TeamBaseException):
    """Raised when team is at maximum capacity"""
    
    def __init__(self, team_name: str, current_size: int, max_size: int):
        message = f"Team '{team_name}' is at maximum capacity ({current_size}/{max_size})"
        
        details = {
            'team_name': team_name,
            'current_size': current_size,
            'max_size': max_size,
            'suggestion': 'Team must remove members before accepting new invitations'
        }
        
        super().__init__(message, 'TEAM_FULL', details)


# Role Management Errors

class InvalidRoleAssignmentError(TeamBaseException):
    """Raised when attempting invalid role assignments"""
    
    def __init__(self, attempted_role: str, reason: str, player_name: str = None):
        message = f"Cannot assign role '{attempted_role}'"
        if reason:
            message += f": {reason}"
        if player_name:
            message = f"Cannot assign role '{attempted_role}' to '{player_name}': {reason}"
        
        details = {
            'attempted_role': attempted_role,
            'reason': reason,
            'player_name': player_name,
            'valid_roles': ['MEMBER', 'LEADER'],
            'suggestion': 'Use transfer_ownership for ownership changes'
        }
        
        super().__init__(message, 'INVALID_ROLE_ASSIGNMENT', details)


class OwnershipTransferError(TeamBaseException):
    """Raised when ownership transfer fails"""
    
    def __init__(self, reason: str, team_name: str = None, new_owner: str = None):
        message = f"Ownership transfer failed: {reason}"
        if team_name:
            message = f"Cannot transfer ownership of '{team_name}': {reason}"
        
        details = {
            'reason': reason,
            'team_name': team_name,
            'new_owner': new_owner,
            'suggestion': 'Ensure new owner is an active team member'
        }
        
        super().__init__(message, 'OWNERSHIP_TRANSFER_FAILED', details)


# Tournament Validation Errors

class TournamentValidationError(TeamBaseException):
    """Raised for general tournament validation failures"""
    
    def __init__(self, validation_type: str, details_msg: str, tournament_name: str = None):
        message = f"Tournament validation failed: {validation_type}"
        if tournament_name:
            message = f"Validation failed for '{tournament_name}': {validation_type}"
        
        details = {
            'validation_type': validation_type,
            'details': details_msg,
            'tournament_name': tournament_name,
            'suggestion': 'Review tournament requirements and team composition'
        }
        
        super().__init__(message, 'TOURNAMENT_VALIDATION_ERROR', details)


# Utility Functions for Error Handling

def handle_django_validation_error(error: DjangoValidationError, context: Dict[str, Any] = None) -> TeamBaseException:
    """Convert Django ValidationError to appropriate team exception"""
    error_message = str(error)
    
    # Map common Django validation errors to specific team exceptions
    if 'duplicate' in error_message.lower() or 'unique' in error_message.lower():
        return DuplicateTeamNameError("Team name already exists")
    elif 'required' in error_message.lower():
        return TeamBaseException(f"Required field missing: {error_message}", 'VALIDATION_ERROR')
    else:
        return TeamBaseException(f"Validation error: {error_message}", 'VALIDATION_ERROR')


def log_team_operation(operation: str, team_id: str = None, user_id: str = None, 
                      success: bool = True, details: Dict[str, Any] = None):
    """Log team operations for monitoring and debugging"""
    log_data = {
        'operation': operation,
        'team_id': team_id,
        'user_id': user_id,
        'success': success,
        'details': details or {}
    }
    
    if success:
        logger.info(f"Team operation successful: {operation}", extra=log_data)
    else:
        logger.warning(f"Team operation failed: {operation}", extra=log_data)


def create_error_response(exception: TeamBaseException, status_code: int = 400) -> Dict[str, Any]:
    """Create standardized error response for API endpoints"""
    return {
        'success': False,
        'error': exception.to_dict(),
        'status_code': status_code
    }


# Error monitoring and alerting

class TeamErrorMonitor:
    """Monitor and track team-related errors for system health"""
    
    @staticmethod
    def track_error(exception: TeamBaseException, context: Dict[str, Any] = None):
        """Track error occurrence for monitoring dashboards"""
        # Log error with context
        exception.log_error(context)
        
        # In a production environment, this could send metrics to monitoring systems
        # like Prometheus, DataDog, or CloudWatch
        error_metrics = {
            'error_type': exception.__class__.__name__,
            'error_code': exception.error_code,
            'timestamp': 'now',  # Would use actual timestamp
            'context': context or {}
        }
        
        # Example: Send to monitoring system
        # monitoring_client.increment('team_errors', tags=error_metrics)
        
        logger.info(f"Error tracked for monitoring: {exception.error_code}", extra=error_metrics)
    
    @staticmethod
    def should_alert(exception: TeamBaseException) -> bool:
        """Determine if error should trigger an alert"""
        # Define critical errors that require immediate attention
        critical_errors = [
            'STATISTICS_CALCULATION_ERROR',
            'HISTORY_RECORDING_ERROR',
            'MATCH_NOT_FOUND',
            'UNAUTHORIZED_SCORING'
        ]
        
        return exception.error_code in critical_errors
    
    @staticmethod
    def send_alert(exception: TeamBaseException, context: Dict[str, Any] = None):
        """Send alert for critical errors"""
        if TeamErrorMonitor.should_alert(exception):
            alert_data = {
                'severity': 'HIGH',
                'error_type': exception.__class__.__name__,
                'message': exception.message,
                'context': context or {},
                'timestamp': 'now'  # Would use actual timestamp
            }
            
            # In production, this would integrate with alerting systems
            # like PagerDuty, Slack, or email notifications
            logger.critical(f"ALERT: Critical team system error: {exception.message}", extra=alert_data)