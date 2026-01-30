"""
Monitoring and Alerting System for Team-Based Tournament System

This module provides comprehensive monitoring, alerting, and health checking
capabilities for team operations with integration points for external monitoring systems.
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from collections import defaultdict, deque
from threading import Lock
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .exceptions import TeamBaseException
from .logging_config import get_team_logger, TeamMetricsCollector

# Configure logger
logger = logging.getLogger('teams.monitoring')


class TeamSystemMonitor:
    """Central monitoring system for team operations"""
    
    def __init__(self):
        self.metrics_lock = Lock()
        self.error_counts = defaultdict(int)
        self.operation_counts = defaultdict(int)
        self.response_times = defaultdict(deque)
        self.alert_handlers = []
        self.health_checks = {}
        
        # Configuration
        self.max_response_time_samples = 100
        self.error_threshold = 10  # errors per minute
        self.response_time_threshold = 5.0  # seconds
        self.health_check_interval = 300  # 5 minutes
    
    def record_operation(self, operation: str, success: bool, duration: float, 
                        context: Dict[str, Any] = None):
        """Record operation metrics"""
        with self.metrics_lock:
            # Update operation counts
            self.operation_counts[f"{operation}_total"] += 1
            if success:
                self.operation_counts[f"{operation}_success"] += 1
            else:
                self.operation_counts[f"{operation}_error"] += 1
            
            # Update response times
            if operation not in self.response_times:
                self.response_times[operation] = deque(maxlen=self.max_response_time_samples)
            self.response_times[operation].append(duration)
            
            # Check for alerts
            self._check_response_time_alert(operation, duration)
        
        # Record metrics
        TeamMetricsCollector.record_operation_metric(
            operation=operation,
            success=success,
            duration=duration,
            team_id=context.get('team_id') if context else None,
            user_id=context.get('user_id') if context else None
        )
        
        # Cache recent metrics
        self._cache_metrics(operation, success, duration)
    
    def record_error(self, error: TeamBaseException, context: Dict[str, Any] = None):
        """Record error occurrence"""
        error_key = f"{error.__class__.__name__}_{error.error_code}"
        
        with self.metrics_lock:
            self.error_counts[error_key] += 1
            
            # Check for error rate alerts
            self._check_error_rate_alert(error_key)
        
        # Record error metrics
        TeamMetricsCollector.record_error_metric(
            error_type=error.__class__.__name__,
            error_code=error.error_code,
            operation=context.get('operation') if context else None,
            team_id=context.get('team_id') if context else None,
            user_id=context.get('user_id') if context else None
        )
        
        # Send alert if critical
        if self._is_critical_error(error):
            self._send_alert({
                'type': 'critical_error',
                'error_type': error.__class__.__name__,
                'error_code': error.error_code,
                'message': error.message,
                'context': context or {},
                'timestamp': datetime.utcnow().isoformat()
            })
    
    def add_alert_handler(self, handler: Callable[[Dict[str, Any]], None]):
        """Add an alert handler function"""
        self.alert_handlers.append(handler)
    
    def add_health_check(self, name: str, check_func: Callable[[], Dict[str, Any]]):
        """Add a health check function"""
        self.health_checks[name] = check_func
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {},
            'metrics': self._get_current_metrics(),
            'alerts': self._get_active_alerts()
        }
        
        # Run health checks
        for check_name, check_func in self.health_checks.items():
            try:
                check_result = check_func()
                health_status['checks'][check_name] = check_result
                
                # Update overall status
                if check_result.get('status') != 'healthy':
                    health_status['status'] = 'degraded'
            
            except Exception as e:
                health_status['checks'][check_name] = {
                    'status': 'error',
                    'error': str(e)
                }
                health_status['status'] = 'unhealthy'
        
        return health_status
    
    def get_metrics_summary(self, time_window: int = 3600) -> Dict[str, Any]:
        """Get metrics summary for the specified time window (seconds)"""
        with self.metrics_lock:
            summary = {
                'time_window_seconds': time_window,
                'timestamp': datetime.utcnow().isoformat(),
                'operations': dict(self.operation_counts),
                'errors': dict(self.error_counts),
                'response_times': {}
            }
            
            # Calculate response time statistics
            for operation, times in self.response_times.items():
                if times:
                    times_list = list(times)
                    summary['response_times'][operation] = {
                        'count': len(times_list),
                        'avg': sum(times_list) / len(times_list),
                        'min': min(times_list),
                        'max': max(times_list),
                        'p95': self._percentile(times_list, 95),
                        'p99': self._percentile(times_list, 99)
                    }
        
        return summary
    
    def reset_metrics(self):
        """Reset all metrics (useful for testing)"""
        with self.metrics_lock:
            self.error_counts.clear()
            self.operation_counts.clear()
            self.response_times.clear()
    
    def _check_response_time_alert(self, operation: str, duration: float):
        """Check if response time exceeds threshold"""
        if duration > self.response_time_threshold:
            self._send_alert({
                'type': 'slow_response',
                'operation': operation,
                'duration': duration,
                'threshold': self.response_time_threshold,
                'timestamp': datetime.utcnow().isoformat()
            })
    
    def _check_error_rate_alert(self, error_key: str):
        """Check if error rate exceeds threshold"""
        # Get error count from last minute
        cache_key = f"error_rate_{error_key}"
        recent_errors = cache.get(cache_key, [])
        
        # Add current timestamp
        now = datetime.utcnow()
        recent_errors.append(now.timestamp())
        
        # Remove errors older than 1 minute
        minute_ago = (now - timedelta(minutes=1)).timestamp()
        recent_errors = [ts for ts in recent_errors if ts > minute_ago]
        
        # Cache updated list
        cache.set(cache_key, recent_errors, 300)  # 5 minutes
        
        # Check threshold
        if len(recent_errors) > self.error_threshold:
            self._send_alert({
                'type': 'high_error_rate',
                'error_key': error_key,
                'count': len(recent_errors),
                'threshold': self.error_threshold,
                'time_window': '1 minute',
                'timestamp': datetime.utcnow().isoformat()
            })
    
    def _is_critical_error(self, error: TeamBaseException) -> bool:
        """Determine if error is critical and requires immediate attention"""
        critical_error_codes = [
            'STATISTICS_CALCULATION_ERROR',
            'HISTORY_RECORDING_ERROR',
            'MATCH_NOT_FOUND',
            'UNAUTHORIZED_SCORING',
            'INTERNAL_SERVER_ERROR'
        ]
        return error.error_code in critical_error_codes
    
    def _send_alert(self, alert_data: Dict[str, Any]):
        """Send alert to all registered handlers"""
        for handler in self.alert_handlers:
            try:
                handler(alert_data)
            except Exception as e:
                logger.error(f"Alert handler failed: {str(e)}", exc_info=True)
    
    def _get_current_metrics(self) -> Dict[str, Any]:
        """Get current metrics snapshot"""
        with self.metrics_lock:
            return {
                'operations': dict(self.operation_counts),
                'errors': dict(self.error_counts),
                'response_time_samples': {
                    op: len(times) for op, times in self.response_times.items()
                }
            }
    
    def _get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get list of active alerts"""
        # In a real implementation, this would track active alerts
        # For now, return empty list
        return []
    
    def _cache_metrics(self, operation: str, success: bool, duration: float):
        """Cache recent metrics for quick access"""
        cache_key = f"team_metrics_{operation}"
        metrics = cache.get(cache_key, {
            'total': 0,
            'success': 0,
            'error': 0,
            'avg_duration': 0,
            'last_updated': None
        })
        
        # Update metrics
        metrics['total'] += 1
        if success:
            metrics['success'] += 1
        else:
            metrics['error'] += 1
        
        # Update average duration
        if metrics['total'] == 1:
            metrics['avg_duration'] = duration
        else:
            metrics['avg_duration'] = (
                (metrics['avg_duration'] * (metrics['total'] - 1) + duration) / metrics['total']
            )
        
        metrics['last_updated'] = datetime.utcnow().isoformat()
        
        # Cache for 1 hour
        cache.set(cache_key, metrics, 3600)
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of a list of numbers"""
        if not data:
            return 0.0
        
        sorted_data = sorted(data)
        index = (percentile / 100.0) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))


# Global monitor instance
team_monitor = TeamSystemMonitor()


# Alert handlers

def console_alert_handler(alert_data: Dict[str, Any]):
    """Simple console alert handler for development"""
    alert_type = alert_data.get('type', 'unknown')
    timestamp = alert_data.get('timestamp', 'unknown')
    
    print(f"\n🚨 TEAM SYSTEM ALERT [{alert_type.upper()}] - {timestamp}")
    print(f"Details: {json.dumps(alert_data, indent=2)}")
    print("=" * 50)


def log_alert_handler(alert_data: Dict[str, Any]):
    """Log alert handler"""
    logger.critical(f"Team system alert: {alert_data['type']}", extra=alert_data)


def email_alert_handler(alert_data: Dict[str, Any]):
    """Email alert handler (placeholder for production implementation)"""
    # In production, this would integrate with email service
    logger.info(f"Email alert would be sent: {alert_data['type']}")


def slack_alert_handler(alert_data: Dict[str, Any]):
    """Slack alert handler (placeholder for production implementation)"""
    # In production, this would integrate with Slack API
    logger.info(f"Slack alert would be sent: {alert_data['type']}")


# Health checks

def database_health_check() -> Dict[str, Any]:
    """Check database connectivity and performance"""
    try:
        from django.db import connection
        from .models import Team
        
        start_time = datetime.now()
        
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        # Test model query
        Team.objects.filter(is_active=True).count()
        
        duration = (datetime.now() - start_time).total_seconds()
        
        return {
            'status': 'healthy',
            'response_time_seconds': duration,
            'details': 'Database connection and queries working normally'
        }
    
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'details': 'Database connection or query failed'
        }


def cache_health_check() -> Dict[str, Any]:
    """Check cache system health"""
    try:
        test_key = 'health_check_test'
        test_value = 'test_value'
        
        # Test cache write
        cache.set(test_key, test_value, 60)
        
        # Test cache read
        cached_value = cache.get(test_key)
        
        if cached_value == test_value:
            # Clean up
            cache.delete(test_key)
            
            return {
                'status': 'healthy',
                'details': 'Cache read/write operations working normally'
            }
        else:
            return {
                'status': 'unhealthy',
                'details': 'Cache read operation returned unexpected value'
            }
    
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'details': 'Cache operation failed'
        }


def team_operations_health_check() -> Dict[str, Any]:
    """Check team operations health"""
    try:
        from .models import Team, TeamMembership
        
        # Check recent team activity
        recent_teams = Team.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        # Check active teams
        active_teams = Team.objects.filter(is_active=True).count()
        
        # Check active memberships
        active_memberships = TeamMembership.objects.filter(is_active=True).count()
        
        return {
            'status': 'healthy',
            'details': {
                'active_teams': active_teams,
                'active_memberships': active_memberships,
                'teams_created_24h': recent_teams
            }
        }
    
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'details': 'Team operations health check failed'
        }


# Performance monitoring

class PerformanceMonitor:
    """Monitor performance of team operations"""
    
    def __init__(self):
        self.operation_times = defaultdict(list)
        self.slow_operations = []
        self.lock = Lock()
    
    def record_operation_time(self, operation: str, duration: float, context: Dict[str, Any] = None):
        """Record operation execution time"""
        with self.lock:
            self.operation_times[operation].append({
                'duration': duration,
                'timestamp': datetime.utcnow(),
                'context': context or {}
            })
            
            # Keep only recent data (last 1000 operations per type)
            if len(self.operation_times[operation]) > 1000:
                self.operation_times[operation] = self.operation_times[operation][-1000:]
            
            # Track slow operations
            if duration > 2.0:  # 2 seconds threshold
                self.slow_operations.append({
                    'operation': operation,
                    'duration': duration,
                    'timestamp': datetime.utcnow(),
                    'context': context or {}
                })
                
                # Keep only recent slow operations
                if len(self.slow_operations) > 100:
                    self.slow_operations = self.slow_operations[-100:]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get performance analysis report"""
        with self.lock:
            report = {
                'timestamp': datetime.utcnow().isoformat(),
                'operations': {},
                'slow_operations': self.slow_operations[-10:],  # Last 10 slow operations
                'summary': {}
            }
            
            total_operations = 0
            total_duration = 0
            
            for operation, times in self.operation_times.items():
                if not times:
                    continue
                
                durations = [t['duration'] for t in times]
                total_operations += len(durations)
                total_duration += sum(durations)
                
                report['operations'][operation] = {
                    'count': len(durations),
                    'avg_duration': sum(durations) / len(durations),
                    'min_duration': min(durations),
                    'max_duration': max(durations),
                    'p95_duration': self._percentile(durations, 95),
                    'slow_operations_count': len([d for d in durations if d > 2.0])
                }
            
            report['summary'] = {
                'total_operations': total_operations,
                'avg_duration_all': total_duration / total_operations if total_operations > 0 else 0,
                'total_slow_operations': len(self.slow_operations)
            }
            
            return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0.0
        
        sorted_data = sorted(data)
        index = (percentile / 100.0) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))


# Global performance monitor
performance_monitor = PerformanceMonitor()


# Setup monitoring system

def setup_team_monitoring():
    """Setup the team monitoring system"""
    
    # Add alert handlers
    if settings.DEBUG:
        team_monitor.add_alert_handler(console_alert_handler)
    
    team_monitor.add_alert_handler(log_alert_handler)
    
    # In production, add email and Slack handlers
    # team_monitor.add_alert_handler(email_alert_handler)
    # team_monitor.add_alert_handler(slack_alert_handler)
    
    # Add health checks
    team_monitor.add_health_check('database', database_health_check)
    team_monitor.add_health_check('cache', cache_health_check)
    team_monitor.add_health_check('team_operations', team_operations_health_check)
    
    logger.info("Team monitoring system initialized")


# Context managers for monitoring

class MonitoredOperation:
    """Context manager for monitoring team operations"""
    
    def __init__(self, operation: str, team_id: str = None, user_id: str = None):
        self.operation = operation
        self.team_id = team_id
        self.user_id = user_id
        self.start_time = None
        self.context = {
            'operation': operation,
            'team_id': team_id,
            'user_id': user_id
        }
    
    def __enter__(self):
        self.start_time = datetime.now()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        success = exc_type is None
        
        # Record in monitoring system
        team_monitor.record_operation(self.operation, success, duration, self.context)
        performance_monitor.record_operation_time(self.operation, duration, self.context)
        
        # Record error if operation failed
        if not success and isinstance(exc_val, TeamBaseException):
            team_monitor.record_error(exc_val, self.context)


# Initialize monitoring system
setup_team_monitoring()