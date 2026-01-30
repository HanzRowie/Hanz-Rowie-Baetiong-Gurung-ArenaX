"""
Comprehensive test suite for the team-based tournament error handling system.

This test suite validates all aspects of the error handling implementation:
- Custom exceptions
- Error handlers and decorators
- Logging functionality
- Monitoring and alerting
- User feedback system
"""

import unittest
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status
import json
import logging

from .exceptions import (
    DuplicateTeamNameError, TeamSizeLimitError, InsufficientPermissionsError,
    InvalidTeamCompositionError, InvitationExpiredError, InvalidScoreError,
    MatchNotFoundError, UnauthorizedScoringError, MatchAlreadyScoredError,
    StatisticsCalculationError, HistoryRecordingError, InvitationStateError,
    TeamErrorMonitor, log_team_operation
)
from .error_handlers import (
    team_error_handler, handle_team_exception, TeamOperationContext,
    validate_team_operation_permissions, validate_team_capacity
)
from .monitoring import team_monitor, performance_monitor, MonitoredOperation
from .user_feedback import UserFeedbackGenerator, create_user_friendly_response
from .logging_config import get_team_logger, PerformanceLogger
from .models import Team, TeamMembership
from accounts.models import CustomUser


class TeamExceptionsTestCase(TestCase):
    """Test custom team exceptions"""
    
    def test_duplicate_team_name_error(self):
        """Test DuplicateTeamNameError exception"""
        error = DuplicateTeamNameError('Test Team', 'FUTSAL')
        
        self.assertEqual(error.error_code, 'DUPLICATE_TEAM_NAME')
        self.assertIn('Test Team', error.message)
        self.assertIn('FUTSAL', error.message)
        
        error_dict = error.to_dict()
        self.assertIn('error_code', error_dict)
        self.assertIn('message', error_dict)
        self.assertIn('details', error_dict)
        self.assertIn('suggestion', error_dict['details'])
    
    def test_team_size_limit_error(self):
        """Test TeamSizeLimitError exception"""
        error = TeamSizeLimitError(15, 15, 'Test Team')
        
        self.assertEqual(error.error_code, 'TEAM_SIZE_LIMIT_EXCEEDED')
        self.assertIn('15', error.message)
        self.assertIn('Test Team', error.message)
        
        error_dict = error.to_dict()
        self.assertEqual(error_dict['details']['current_size'], 15)
        self.assertEqual(error_dict['details']['max_size'], 15)
    
    def test_insufficient_permissions_error(self):
        """Test InsufficientPermissionsError exception"""
        error = InsufficientPermissionsError('OWNER', 'MEMBER', 'delete team')
        
        self.assertEqual(error.error_code, 'INSUFFICIENT_PERMISSIONS')
        self.assertIn('OWNER', error.message)
        self.assertIn('MEMBER', error.message)
        self.assertIn('delete team', error.message)
    
    def test_invalid_team_composition_error(self):
        """Test InvalidTeamCompositionError exception"""
        error = InvalidTeamCompositionError('FUTSAL', 5, 3, True, 10)
        
        self.assertEqual(error.error_code, 'INVALID_TEAM_COMPOSITION')
        self.assertIn('FUTSAL', error.message)
        self.assertIn('5', error.message)
        self.assertIn('3', error.message)
        
        error_dict = error.to_dict()
        self.assertTrue(error_dict['details']['allows_substitutes'])
        self.assertEqual(error_dict['details']['max_substitutes'], 10)
    
    def test_invitation_expired_error(self):
        """Test InvitationExpiredError exception"""
        error = InvitationExpiredError('test-invitation-id', '2024-01-01')
        
        self.assertEqual(error.error_code, 'INVITATION_EXPIRED')
        self.assertIn('expired', error.message.lower())
        self.assertIn('2024-01-01', error.message)
    
    def test_invalid_score_error(self):
        """Test InvalidScoreError exception"""
        error = InvalidScoreError('BADMINTON', 'Set score exceeds 30 points', {'home': 35, 'away': 20})
        
        self.assertEqual(error.error_code, 'INVALID_SCORE')
        self.assertIn('BADMINTON', error.message)
        self.assertIn('Set score exceeds 30 points', error.message)
        
        error_dict = error.to_dict()
        self.assertEqual(error_dict['details']['provided_score']['home'], 35)
    
    def test_error_logging(self):
        """Test error logging functionality"""
        error = DuplicateTeamNameError('Test Team')
        
        with patch('teams.exceptions.logger') as mock_logger:
            error.log_error({'test': 'context'})
            mock_logger.error.assert_called_once()
            
            # Check log message contains error details
            call_args = mock_logger.error.call_args
            self.assertIn('Team operation error', call_args[0][0])


class ErrorHandlersTestCase(TestCase):
    """Test error handlers and decorators"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='PLAYER',
            full_name='Test User'
        )
    
    def test_team_error_handler_decorator(self):
        """Test team_error_handler decorator"""
        
        @team_error_handler('test_operation')
        def test_view(request):
            raise DuplicateTeamNameError('Test Team')
        
        request = self.factory.get('/test/')
        request.user = self.user
        
        response = test_view(request)
        
        self.assertEqual(response.status_code, 400)
        response_data = response.data  # Use .data instead of json.loads(response.content)
        self.assertFalse(response_data['success'])
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error']['error_code'], 'DUPLICATE_TEAM_NAME')
    
    def test_team_operation_context(self):
        """Test TeamOperationContext context manager"""
        
        with patch('teams.error_handlers.log_team_operation') as mock_log:
            with TeamOperationContext('test_operation', 'team-id', 'user-id'):
                pass  # Successful operation
            
            # Should log start and completion
            self.assertEqual(mock_log.call_count, 2)
            
            # Check completion log
            completion_call = mock_log.call_args_list[1]
            self.assertIn('test_operation_completed', completion_call[1]['operation'])
            self.assertTrue(completion_call[1]['success'])
    
    def test_team_operation_context_with_error(self):
        """Test TeamOperationContext with error"""
        
        with patch('teams.error_handlers.log_team_operation') as mock_log:
            with patch('teams.error_handlers.TeamErrorMonitor.track_error') as mock_track:
                try:
                    with TeamOperationContext('test_operation', 'team-id', 'user-id'):
                        raise DuplicateTeamNameError('Test Team')
                except DuplicateTeamNameError:
                    pass
                
                # Should log failure
                failure_call = mock_log.call_args_list[1]
                self.assertIn('test_operation_failed', failure_call[1]['operation'])
                self.assertFalse(failure_call[1]['success'])
                
                # Should track error
                mock_track.assert_called_once()


class MonitoringTestCase(TestCase):
    """Test monitoring and alerting system"""
    
    def setUp(self):
        # Reset monitoring state
        team_monitor.reset_metrics()
        performance_monitor.operation_times.clear()
        performance_monitor.slow_operations.clear()
    
    def test_operation_monitoring(self):
        """Test operation monitoring"""
        
        with MonitoredOperation('test_operation', 'team-id', 'user-id'):
            pass  # Simulate operation
        
        metrics = team_monitor.get_metrics_summary()
        self.assertIn('test_operation_total', metrics['operations'])
        self.assertIn('test_operation_success', metrics['operations'])
        self.assertEqual(metrics['operations']['test_operation_total'], 1)
        self.assertEqual(metrics['operations']['test_operation_success'], 1)
    
    def test_error_monitoring(self):
        """Test error monitoring"""
        error = DuplicateTeamNameError('Test Team')
        context = {'operation': 'create_team', 'team_id': 'test-id'}
        
        team_monitor.record_error(error, context)
        
        metrics = team_monitor.get_metrics_summary()
        error_key = f"{error.__class__.__name__}_{error.error_code}"
        self.assertIn(error_key, metrics['errors'])
        self.assertEqual(metrics['errors'][error_key], 1)
    
    def test_performance_monitoring(self):
        """Test performance monitoring"""
        performance_monitor.record_operation_time('test_operation', 0.5, {'test': 'context'})
        
        report = performance_monitor.get_performance_report()
        self.assertIn('test_operation', report['operations'])
        self.assertEqual(report['operations']['test_operation']['count'], 1)
        self.assertEqual(report['operations']['test_operation']['avg_duration'], 0.5)
    
    def test_system_health_check(self):
        """Test system health check"""
        health = team_monitor.get_system_health()
        
        self.assertIn('status', health)
        self.assertIn('timestamp', health)
        self.assertIn('checks', health)
        self.assertIn('metrics', health)
        
        # Status should be healthy initially
        self.assertIn(health['status'], ['healthy', 'degraded', 'unhealthy'])


class UserFeedbackTestCase(TestCase):
    """Test user feedback system"""
    
    def test_error_feedback_generation(self):
        """Test error feedback generation"""
        error = DuplicateTeamNameError('Test Team', 'FUTSAL')
        
        feedback = UserFeedbackGenerator.generate_error_feedback(error)
        
        self.assertIn('error_code', feedback)
        self.assertIn('title', feedback)
        self.assertIn('message', feedback)
        self.assertIn('suggestions', feedback)
        self.assertIn('help_link', feedback)
        self.assertIn('severity', feedback)
        self.assertIn('user_actions', feedback)
        
        self.assertEqual(feedback['error_code'], 'DUPLICATE_TEAM_NAME')
        self.assertIsInstance(feedback['suggestions'], list)
        self.assertGreater(len(feedback['suggestions']), 0)
    
    def test_success_feedback_generation(self):
        """Test success feedback generation"""
        feedback = UserFeedbackGenerator.generate_success_feedback(
            'create_team', 
            {'team_id': 'test-id', 'name': 'Test Team'}
        )
        
        self.assertTrue(feedback['success'])
        self.assertIn('title', feedback)
        self.assertIn('message', feedback)
        self.assertIn('next_steps', feedback)
        self.assertIn('result', feedback)
        
        self.assertIsInstance(feedback['next_steps'], list)
    
    def test_user_friendly_response_creation(self):
        """Test user-friendly response creation"""
        # Test success response
        success_response = create_user_friendly_response(
            success=True,
            operation='create_team',
            result={'team_id': 'test-id'}
        )
        
        self.assertTrue(success_response['success'])
        self.assertIn('data', success_response)
        self.assertIn('feedback', success_response)
        
        # Test error response
        error = DuplicateTeamNameError('Test Team')
        error_response = create_user_friendly_response(
            success=False,
            operation='create_team',
            error=error
        )
        
        self.assertFalse(error_response['success'])
        self.assertIn('error', error_response)
        self.assertEqual(error_response['error']['error_code'], 'DUPLICATE_TEAM_NAME')


class LoggingTestCase(TestCase):
    """Test logging functionality"""
    
    def test_team_logger_creation(self):
        """Test team logger creation with context"""
        logger = get_team_logger('test-team-id', 'test-user-id')
        
        self.assertIsNotNone(logger)
        self.assertEqual(logger.team_id, 'test-team-id')
        self.assertEqual(logger.user_id, 'test-user-id')
    
    def test_performance_logger(self):
        """Test performance logger context manager"""
        with patch('teams.logging_config.get_team_logger') as mock_get_logger:
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger
            
            with PerformanceLogger('test_operation', 'team-id', 'user-id'):
                pass  # Simulate operation
            
            # Should log start and completion
            self.assertEqual(mock_logger.info.call_count, 2)
            
            # Check log messages
            start_call = mock_logger.info.call_args_list[0]
            completion_call = mock_logger.info.call_args_list[1]
            
            self.assertIn('Starting operation', start_call[0][0])
            self.assertIn('Operation completed', completion_call[0][0])
    
    def test_operation_logging(self):
        """Test operation logging function"""
        with patch('teams.exceptions.logger') as mock_logger:
            log_team_operation(
                operation='test_operation',
                team_id='test-team-id',
                user_id='test-user-id',
                success=True,
                details={'test': 'data'}
            )
            
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args
            self.assertIn('Team operation successful', call_args[0][0])


class IntegrationTestCase(APITestCase):
    """Integration tests for error handling in API endpoints"""
    
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='PLAYER',
            full_name='Test User'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_team_duplicate_name_error(self):
        """Test duplicate team name error in API"""
        # Create first team
        Team.objects.create(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner=self.user,
            is_active=True
        )
        
        # Try to create duplicate
        response = self.client.post('/api/teams/', {
            'name': 'Test Team',
            'sport_types': ['FUTSAL']
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error']['error_code'], 'DUPLICATE_TEAM_NAME')
    
    def test_team_not_found_error(self):
        """Test team not found error in API"""
        response = self.client.get('/api/teams/nonexistent-id/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('error', response_data)
    
    def test_insufficient_permissions_error(self):
        """Test insufficient permissions error in API"""
        # Create team owned by another user
        other_user = CustomUser.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123',
            role='PLAYER',
            full_name='Other User'
        )
        
        team = Team.objects.create(
            name='Other Team',
            sport_types=['FUTSAL'],
            owner=other_user,
            is_active=True
        )
        
        # Try to update team as non-owner
        response = self.client.put(f'/api/teams/{team.id}/', {
            'name': 'Updated Name'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response_data = response.json()
        self.assertFalse(response_data['success'])
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error']['error_code'], 'INSUFFICIENT_PERMISSIONS')


class ErrorHandlingHealthCheckTestCase(TestCase):
    """Test error handling system health checks"""
    
    def test_logging_health_check(self):
        """Test logging system health check"""
        from .logging_config import check_logging_health
        
        health = check_logging_health()
        
        self.assertIn('status', health)
        self.assertIn('checks', health)
        self.assertIn('timestamp', health)
        
        # Should have various health checks
        self.assertIn('log_directory', health['checks'])
        self.assertIn('team_logger', health['checks'])
    
    def test_monitoring_system_health(self):
        """Test monitoring system health"""
        health = team_monitor.get_system_health()
        
        self.assertIn('status', health)
        self.assertIn('checks', health)
        self.assertIn('metrics', health)
        
        # Should include health check results
        for check_name, check_result in health['checks'].items():
            self.assertIn('status', check_result)


if __name__ == '__main__':
    unittest.main()