"""
Error Handlers and Decorators for Team-Based Tournament System

This module provides decorators and utilities for consistent error handling
across all team-related API endpoints with proper logging and monitoring.
"""

import functools
import logging
from typing import Callable, Dict, Any, Optional
from django.http import JsonResponse
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response

from .exceptions import (
    TeamBaseException, DuplicateTeamNameError, TeamSizeLimitError,
    InsufficientPermissionsError, InvalidOwnershipTransferError,
    InvalidTeamCompositionError, IneligiblePlayerError, RegistrationDeadlineError,
    ConflictingRegistrationError, InvalidScoreError, MatchNotFoundError,
    UnauthorizedScoringError, MatchAlreadyScoredError, StatisticsCalculationError,
    HistoryRecordingError, InvitationStateError, InvitationAlreadyExistsError,
    InvitationExpiredError, TeamFullError, InvalidRoleAssignmentError,
    OwnershipTransferError, TournamentValidationError, TeamErrorMonitor,
    handle_django_validation_error, log_team_operation
)

# Configure logger
logger = logging.getLogger('teams.error_handlers')


def team_error_handler(operation_name: str = None):
    """
    Decorator for consistent error handling in team API endpoints.
    
    Args:
        operation_name: Name of the operation for logging purposes
    
    Usage:
        @team_error_handler('create_team')
        def create_team_view(request):
            # Your view logic here
            pass
    """
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            operation = operation_name or view_func.__name__
            context = {
                'operation': operation,
                'user_id': str(request.user.id) if hasattr(request, 'user') and request.user.is_authenticated else None,
                'method': request.method,
                'path': request.path,
                'args': args,
                'kwargs': kwargs
            }
            
            try:
                # Execute the view function
                result = view_func(request, *args, **kwargs)
                
                # Log successful operation
                log_team_operation(
                    operation=operation,
                    user_id=context['user_id'],
                    success=True,
                    details={'status_code': getattr(result, 'status_code', 200)}
                )
                
                return result
                
            except TeamBaseException as e:
                # Handle team-specific exceptions
                return handle_team_exception(e, context)
                
            except DjangoValidationError as e:
                # Convert Django validation errors
                team_exception = handle_django_validation_error(e, context)
                return handle_team_exception(team_exception, context)
                
            except Exception as e:
                # Handle unexpected exceptions
                return handle_unexpected_exception(e, context, operation)
        
        return wrapper
    return decorator


def handle_team_exception(exception: TeamBaseException, context: Dict[str, Any]) -> Response:
    """Handle team-specific exceptions with appropriate HTTP status codes"""
    
    # Map exception types to HTTP status codes
    status_code_mapping = {
        # 400 Bad Request
        DuplicateTeamNameError: status.HTTP_400_BAD_REQUEST,
        TeamSizeLimitError: status.HTTP_400_BAD_REQUEST,
        InvalidTeamCompositionError: status.HTTP_400_BAD_REQUEST,
        IneligiblePlayerError: status.HTTP_400_BAD_REQUEST,
        RegistrationDeadlineError: status.HTTP_400_BAD_REQUEST,
        ConflictingRegistrationError: status.HTTP_400_BAD_REQUEST,
        InvalidScoreError: status.HTTP_400_BAD_REQUEST,
        MatchAlreadyScoredError: status.HTTP_400_BAD_REQUEST,
        InvitationStateError: status.HTTP_400_BAD_REQUEST,
        InvitationAlreadyExistsError: status.HTTP_400_BAD_REQUEST,
        InvitationExpiredError: status.HTTP_400_BAD_REQUEST,
        TeamFullError: status.HTTP_400_BAD_REQUEST,
        InvalidRoleAssignmentError: status.HTTP_400_BAD_REQUEST,
        OwnershipTransferError: status.HTTP_400_BAD_REQUEST,
        TournamentValidationError: status.HTTP_400_BAD_REQUEST,
        
        # 403 Forbidden
        InsufficientPermissionsError: status.HTTP_403_FORBIDDEN,
        UnauthorizedScoringError: status.HTTP_403_FORBIDDEN,
        
        # 404 Not Found
        MatchNotFoundError: status.HTTP_404_NOT_FOUND,
        
        # 500 Internal Server Error
        StatisticsCalculationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        HistoryRecordingError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        InvalidOwnershipTransferError: status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    # Get appropriate status code
    status_code = status_code_mapping.get(type(exception), status.HTTP_400_BAD_REQUEST)
    
    # Track error for monitoring
    TeamErrorMonitor.track_error(exception, context)
    
    # Send alert if critical
    if TeamErrorMonitor.should_alert(exception):
        TeamErrorMonitor.send_alert(exception, context)
    
    # Log operation failure
    log_team_operation(
        operation=context.get('operation', 'unknown'),
        user_id=context.get('user_id'),
        success=False,
        details={
            'error_type': exception.__class__.__name__,
            'error_code': exception.error_code,
            'status_code': status_code
        }
    )
    
    # Create response
    response_data = {
        'success': False,
        'error': exception.to_dict()
    }
    
    # Add request context for debugging (only in development)
    if hasattr(context, 'DEBUG') and context.get('DEBUG'):
        response_data['debug_context'] = {
            'operation': context.get('operation'),
            'path': context.get('path'),
            'method': context.get('method')
        }
    
    return Response(response_data, status=status_code)


def handle_unexpected_exception(exception: Exception, context: Dict[str, Any], operation: str) -> Response:
    """Handle unexpected exceptions with proper logging and generic error response"""
    
    # Create generic team exception
    team_exception = TeamBaseException(
        message="An unexpected error occurred",
        error_code="INTERNAL_SERVER_ERROR",
        details={
            'original_error': str(exception),
            'error_type': exception.__class__.__name__
        }
    )
    
    # Log the unexpected error with full context
    logger.error(
        f"Unexpected error in team operation: {operation}",
        extra={
            'operation': operation,
            'error_type': exception.__class__.__name__,
            'error_message': str(exception),
            'context': context
        },
        exc_info=True
    )
    
    # Track for monitoring
    TeamErrorMonitor.track_error(team_exception, context)
    
    # Always send alert for unexpected errors
    TeamErrorMonitor.send_alert(team_exception, context)
    
    # Log operation failure
    log_team_operation(
        operation=operation,
        user_id=context.get('user_id'),
        success=False,
        details={
            'error_type': 'UNEXPECTED_ERROR',
            'original_error': str(exception)
        }
    )
    
    return Response({
        'success': False,
        'error': {
            'error_code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred. Please try again later.',
            'details': {
                'suggestion': 'If the problem persists, please contact support'
            }
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeamErrorMiddleware:
    """Middleware for handling team-related errors at the application level"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        return response
    
    def process_exception(self, request, exception):
        """Process exceptions that occur in team-related views"""
        
        # Only handle team-related requests
        if not request.path.startswith('/api/teams/'):
            return None
        
        context = {
            'middleware': 'TeamErrorMiddleware',
            'user_id': str(request.user.id) if hasattr(request, 'user') and request.user.is_authenticated else None,
            'method': request.method,
            'path': request.path,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'ip_address': self.get_client_ip(request)
        }
        
        if isinstance(exception, TeamBaseException):
            return self.handle_team_exception_middleware(exception, context)
        elif isinstance(exception, DjangoValidationError):
            team_exception = handle_django_validation_error(exception, context)
            return self.handle_team_exception_middleware(team_exception, context)
        
        # Let other exceptions be handled by Django's default handler
        return None
    
    def handle_team_exception_middleware(self, exception: TeamBaseException, context: Dict[str, Any]) -> JsonResponse:
        """Handle team exceptions in middleware"""
        
        # Track error
        TeamErrorMonitor.track_error(exception, context)
        
        # Send alert if critical
        if TeamErrorMonitor.should_alert(exception):
            TeamErrorMonitor.send_alert(exception, context)
        
        # Determine status code
        status_code_mapping = {
            InsufficientPermissionsError: 403,
            UnauthorizedScoringError: 403,
            MatchNotFoundError: 404,
            StatisticsCalculationError: 500,
            HistoryRecordingError: 500,
        }
        
        status_code = status_code_mapping.get(type(exception), 400)
        
        return JsonResponse({
            'success': False,
            'error': exception.to_dict()
        }, status=status_code)
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# Utility functions for error handling

def validate_team_operation_permissions(user, team, required_roles: list) -> None:
    """
    Validate user permissions for team operations.
    
    Args:
        user: User performing the operation
        team: Team being operated on
        required_roles: List of roles that can perform the operation
    
    Raises:
        InsufficientPermissionsError: If user lacks required permissions
    """
    from .models import TeamMembership
    
    try:
        membership = TeamMembership.objects.get(
            team=team,
            player=user,
            is_active=True
        )
        
        if membership.role not in required_roles:
            raise InsufficientPermissionsError(
                required_role=' or '.join(required_roles),
                user_role=membership.role,
                operation=f"perform operation on team '{team.name}'"
            )
    
    except TeamMembership.DoesNotExist:
        raise InsufficientPermissionsError(
            required_role=' or '.join(required_roles),
            operation=f"access team '{team.name}' (not a member)"
        )


def validate_team_capacity(team, additional_members: int = 1) -> None:
    """
    Validate team capacity before adding members.
    
    Args:
        team: Team to validate
        additional_members: Number of members to add
    
    Raises:
        TeamSizeLimitError: If team would exceed capacity
    """
    current_size = team.member_count
    if current_size + additional_members > team.max_size:
        raise TeamSizeLimitError(
            current_size=current_size,
            max_size=team.max_size,
            team_name=team.name
        )


def validate_tournament_registration_eligibility(team, tournament) -> None:
    """
    Validate team eligibility for tournament registration.
    
    Args:
        team: Team attempting to register
        tournament: Tournament to register for
    
    Raises:
        Various tournament-related exceptions based on validation failures
    """
    from datetime import datetime
    from django.utils import timezone
    
    # Check registration deadline
    if tournament.registration_deadline and timezone.now() > tournament.registration_deadline:
        raise RegistrationDeadlineError(
            tournament_name=tournament.title,
            deadline=tournament.registration_deadline.strftime('%Y-%m-%d %H:%M')
        )
    
    # Check sport compatibility
    tournament_sport = tournament.sport_type.upper()
    team_sports = [sport.upper() for sport in team.sport_types]
    
    if tournament_sport not in team_sports:
        raise InvalidTeamCompositionError(
            sport_type=tournament_sport,
            required_players=0,  # Will be filled by specific validation
            current_players=team.member_count
        )


def create_standardized_error_response(error_code: str, message: str, 
                                     details: Dict[str, Any] = None, 
                                     status_code: int = 400) -> Response:
    """
    Create a standardized error response for API endpoints.
    
    Args:
        error_code: Unique error code
        message: Human-readable error message
        details: Additional error details
        status_code: HTTP status code
    
    Returns:
        Response object with standardized error format
    """
    return Response({
        'success': False,
        'error': {
            'error_code': error_code,
            'message': message,
            'details': details or {}
        }
    }, status=status_code)


# Context managers for error handling

class TeamOperationContext:
    """Context manager for team operations with automatic error handling"""
    
    def __init__(self, operation: str, team_id: str = None, user_id: str = None):
        self.operation = operation
        self.team_id = team_id
        self.user_id = user_id
        self.start_time = None
    
    def __enter__(self):
        from datetime import datetime
        self.start_time = datetime.now()
        
        log_team_operation(
            operation=f"{self.operation}_started",
            team_id=self.team_id,
            user_id=self.user_id,
            success=True,
            details={'start_time': self.start_time.isoformat()}
        )
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        from datetime import datetime
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        if exc_type is None:
            # Operation completed successfully
            log_team_operation(
                operation=f"{self.operation}_completed",
                team_id=self.team_id,
                user_id=self.user_id,
                success=True,
                details={
                    'duration_seconds': duration,
                    'end_time': end_time.isoformat()
                }
            )
        else:
            # Operation failed
            error_details = {
                'duration_seconds': duration,
                'end_time': end_time.isoformat(),
                'error_type': exc_type.__name__ if exc_type else 'Unknown',
                'error_message': str(exc_val) if exc_val else 'Unknown error'
            }
            
            log_team_operation(
                operation=f"{self.operation}_failed",
                team_id=self.team_id,
                user_id=self.user_id,
                success=False,
                details=error_details
            )
            
            # Track error if it's a team exception
            if isinstance(exc_val, TeamBaseException):
                TeamErrorMonitor.track_error(exc_val, {
                    'operation': self.operation,
                    'team_id': self.team_id,
                    'user_id': self.user_id,
                    'duration': duration
                })
        
        # Don't suppress exceptions
        return False


# Batch operation error handling

def handle_batch_operation_errors(operations: list, operation_name: str) -> Dict[str, Any]:
    """
    Handle errors in batch operations and provide detailed results.
    
    Args:
        operations: List of operation functions to execute
        operation_name: Name of the batch operation
    
    Returns:
        Dictionary with success/failure counts and error details
    """
    results = {
        'total_operations': len(operations),
        'successful_operations': 0,
        'failed_operations': 0,
        'errors': [],
        'success_rate': 0.0
    }
    
    for i, operation in enumerate(operations):
        try:
            operation()
            results['successful_operations'] += 1
        except TeamBaseException as e:
            results['failed_operations'] += 1
            results['errors'].append({
                'operation_index': i,
                'error_code': e.error_code,
                'message': e.message,
                'details': e.details
            })
            
            # Track individual error
            TeamErrorMonitor.track_error(e, {
                'batch_operation': operation_name,
                'operation_index': i
            })
        
        except Exception as e:
            results['failed_operations'] += 1
            results['errors'].append({
                'operation_index': i,
                'error_code': 'UNEXPECTED_ERROR',
                'message': str(e),
                'details': {'error_type': e.__class__.__name__}
            })
    
    # Calculate success rate
    if results['total_operations'] > 0:
        results['success_rate'] = results['successful_operations'] / results['total_operations']
    
    # Log batch operation summary
    log_team_operation(
        operation=f"batch_{operation_name}",
        success=results['failed_operations'] == 0,
        details=results
    )
    
    return results