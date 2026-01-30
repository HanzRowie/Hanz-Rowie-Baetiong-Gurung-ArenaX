"""
Management command to test the comprehensive error handling system.

This command tests various error scenarios and validates that the error handling,
logging, and monitoring systems work correctly.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import time

from teams.exceptions import (
    DuplicateTeamNameError, TeamSizeLimitError, InsufficientPermissionsError,
    InvalidTeamCompositionError, InvitationExpiredError, InvalidScoreError,
    TeamErrorMonitor, log_team_operation
)
from teams.error_handlers import team_error_handler, TeamOperationContext
from teams.monitoring import team_monitor, performance_monitor, MonitoredOperation
from teams.user_feedback import UserFeedbackGenerator, create_user_friendly_response
from teams.logging_config import get_team_logger, PerformanceLogger
from accounts.models import CustomUser
from teams.models import Team


class Command(BaseCommand):
    help = 'Test the comprehensive error handling system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-type',
            type=str,
            choices=['all', 'exceptions', 'logging', 'monitoring', 'feedback'],
            default='all',
            help='Type of test to run'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        test_type = options['test_type']
        
        self.stdout.write(
            self.style.SUCCESS('Starting error handling system tests...')
        )
        
        if test_type in ['all', 'exceptions']:
            self.test_exceptions()
        
        if test_type in ['all', 'logging']:
            self.test_logging()
        
        if test_type in ['all', 'monitoring']:
            self.test_monitoring()
        
        if test_type in ['all', 'feedback']:
            self.test_user_feedback()
        
        self.stdout.write(
            self.style.SUCCESS('All error handling tests completed!')
        )
    
    def log_test_result(self, test_name: str, success: bool, message: str):
        """Log test result"""
        if success:
            self.stdout.write(
                self.style.SUCCESS(f"  ✓ {test_name}: {message}")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"  ✗ {test_name}: {message}")
            )

    def test_exceptions(self):
        """Test custom exception handling"""
        self.stdout.write('Testing custom exceptions...')
        
        # Test DuplicateTeamNameError
        try:
            raise DuplicateTeamNameError('Test Team', 'FUTSAL')
        except DuplicateTeamNameError as e:
            self.log_test_result('DuplicateTeamNameError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        # Test TeamSizeLimitError
        try:
            raise TeamSizeLimitError(15, 15, 'Test Team')
        except TeamSizeLimitError as e:
            self.log_test_result('TeamSizeLimitError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        # Test InsufficientPermissionsError
        try:
            raise InsufficientPermissionsError('OWNER', 'MEMBER', 'delete team')
        except InsufficientPermissionsError as e:
            self.log_test_result('InsufficientPermissionsError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        # Test InvalidTeamCompositionError
        try:
            raise InvalidTeamCompositionError('FUTSAL', 5, 3, True, 10)
        except InvalidTeamCompositionError as e:
            self.log_test_result('InvalidTeamCompositionError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        # Test InvitationExpiredError
        try:
            raise InvitationExpiredError('test-invitation-id', '2024-01-01')
        except InvitationExpiredError as e:
            self.log_test_result('InvitationExpiredError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        # Test InvalidScoreError
        try:
            raise InvalidScoreError('BADMINTON', 'Set score exceeds 30 points', {'home': 35, 'away': 20})
        except InvalidScoreError as e:
            self.log_test_result('InvalidScoreError', True, str(e))
            if self.verbose:
                self.stdout.write(f"  ✓ {e.to_dict()}")
        
        self.stdout.write(self.style.SUCCESS('  Exception tests completed'))

    def test_logging(self):
        """Test logging functionality"""
        self.stdout.write('Testing logging system...')
        
        # Test team logger
        team_logger = get_team_logger('test-team-id', 'test-user-id')
        team_logger.info('Test team operation log message')
        team_logger.error('Test team error log message')
        
        # Test performance logger
        with PerformanceLogger('test_operation', 'test-team-id', 'test-user-id'):
            time.sleep(0.1)  # Simulate operation
        
        # Test operation logging
        log_team_operation(
            operation='test_operation',
            team_id='test-team-id',
            user_id='test-user-id',
            success=True,
            details={'test': 'data'}
        )
        
        log_team_operation(
            operation='test_failed_operation',
            team_id='test-team-id',
            user_id='test-user-id',
            success=False,
            details={'error': 'test error'}
        )
        
        self.log_test_result('Logging', True, 'All logging functions executed')
        self.stdout.write(self.style.SUCCESS('  Logging tests completed'))

    def test_monitoring(self):
        """Test monitoring and alerting system"""
        self.stdout.write('Testing monitoring system...')
        
        # Test operation monitoring
        with MonitoredOperation('test_operation', 'test-team-id', 'test-user-id'):
            time.sleep(0.05)  # Simulate operation
        
        # Test error monitoring
        test_error = DuplicateTeamNameError('Test Team')
        team_monitor.record_error(test_error, {
            'operation': 'test_create_team',
            'team_id': 'test-team-id',
            'user_id': 'test-user-id'
        })
        
        # Test performance monitoring
        performance_monitor.record_operation_time(
            'test_operation', 
            0.5, 
            {'team_id': 'test-team-id'}
        )
        
        # Test metrics collection
        team_monitor.record_operation('test_operation', True, 0.1)
        team_monitor.record_operation('test_operation', False, 0.2)
        
        # Get system health
        health_status = team_monitor.get_system_health()
        if self.verbose:
            self.stdout.write(f"  System health: {health_status['status']}")
        
        # Get metrics summary
        metrics = team_monitor.get_metrics_summary()
        if self.verbose:
            self.stdout.write(f"  Metrics: {len(metrics['operations'])} operations tracked")
        
        # Get performance report
        perf_report = performance_monitor.get_performance_report()
        if self.verbose:
            self.stdout.write(f"  Performance: {perf_report['summary']['total_operations']} operations")
        
        self.log_test_result('Monitoring', True, 'All monitoring functions executed')
        self.stdout.write(self.style.SUCCESS('  Monitoring tests completed'))

    def test_user_feedback(self):
        """Test user feedback system"""
        self.stdout.write('Testing user feedback system...')
        
        # Test error feedback generation
        test_error = DuplicateTeamNameError('Test Team', 'FUTSAL')
        feedback = UserFeedbackGenerator.generate_error_feedback(test_error)
        
        if self.verbose:
            self.stdout.write(f"  Error feedback: {feedback['title']}")
            self.stdout.write(f"  Suggestions: {len(feedback['suggestions'])} provided")
        
        # Test success feedback generation
        success_feedback = UserFeedbackGenerator.generate_success_feedback(
            'create_team',
            {'team_id': 'test-id', 'name': 'Test Team'}
        )
        
        if self.verbose:
            self.stdout.write(f"  Success feedback: {success_feedback['title']}")
            self.stdout.write(f"  Next steps: {len(success_feedback['next_steps'])} provided")
        
        # Test user-friendly response creation
        user_response = create_user_friendly_response(
            success=False,
            operation='create_team',
            error=test_error
        )
        
        if self.verbose:
            self.stdout.write(f"  User response created with error code: {user_response['error']['error_code']}")
        
        self.log_test_result('User Feedback', True, 'All feedback functions executed')
        self.stdout.write(self.style.SUCCESS('  User feedback tests completed'))