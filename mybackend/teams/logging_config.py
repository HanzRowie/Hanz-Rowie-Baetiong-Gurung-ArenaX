"""
Logging Configuration for Team-Based Tournament System

This module provides logging configuration and utilities for comprehensive
monitoring and debugging of team operations.
"""

import logging
import logging.handlers
import os
from datetime import datetime
from typing import Dict, Any, Optional
from django.conf import settings


class TeamOperationFormatter(logging.Formatter):
    """Custom formatter for team operation logs"""
    
    def format(self, record):
        # Add timestamp
        record.timestamp = datetime.utcnow().isoformat()
        
        # Add team-specific context if available
        if hasattr(record, 'team_id'):
            record.team_context = f"[Team:{record.team_id}]"
        else:
            record.team_context = ""
        
        if hasattr(record, 'user_id'):
            record.user_context = f"[User:{record.user_id}]"
        else:
            record.user_context = ""
        
        # Format the message
        formatted = super().format(record)
        
        # Add structured data if available
        if hasattr(record, 'operation'):
            formatted = f"[{record.operation}] {formatted}"
        
        return formatted


class TeamOperationFilter(logging.Filter):
    """Filter for team operation logs"""
    
    def filter(self, record):
        # Only process team-related logs
        return (
            hasattr(record, 'operation') or 
            record.name.startswith('teams') or
            'team' in record.getMessage().lower()
        )


def setup_team_logging():
    """Setup logging configuration for team operations"""
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(settings.BASE_DIR, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure team operations logger
    team_logger = logging.getLogger('teams')
    team_logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates
    team_logger.handlers.clear()
    
    # File handler for all team operations
    team_file_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'team_operations.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    team_file_handler.setLevel(logging.INFO)
    team_file_handler.setFormatter(TeamOperationFormatter(
        '%(timestamp)s - %(levelname)s - %(team_context)s%(user_context)s - %(message)s'
    ))
    team_file_handler.addFilter(TeamOperationFilter())
    team_logger.addHandler(team_file_handler)
    
    # Error file handler for team errors
    team_error_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'team_errors.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    team_error_handler.setLevel(logging.ERROR)
    team_error_handler.setFormatter(TeamOperationFormatter(
        '%(timestamp)s - %(levelname)s - %(team_context)s%(user_context)s - %(message)s - %(pathname)s:%(lineno)d'
    ))
    team_error_handler.addFilter(TeamOperationFilter())
    team_logger.addHandler(team_error_handler)
    
    # Console handler for development
    if settings.DEBUG:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(TeamOperationFormatter(
            '%(levelname)s - %(team_context)s%(user_context)s - %(message)s'
        ))
        console_handler.addFilter(TeamOperationFilter())
        team_logger.addHandler(console_handler)
    
    # Configure error handlers logger
    error_handler_logger = logging.getLogger('teams.error_handlers')
    error_handler_logger.setLevel(logging.INFO)
    
    # Separate file for error handler logs
    error_handler_file = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'team_error_handlers.log'),
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=3
    )
    error_handler_file.setLevel(logging.INFO)
    error_handler_file.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(name)s - %(message)s'
    ))
    error_handler_logger.addHandler(error_handler_file)
    
    # Configure match scoring logger
    match_logger = logging.getLogger('teams.match_scoring')
    match_logger.setLevel(logging.INFO)
    
    match_file_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'match_scoring.log'),
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5
    )
    match_file_handler.setLevel(logging.INFO)
    match_file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - [Match:%(match_id)s] - %(message)s'
    ))
    match_logger.addHandler(match_file_handler)
    
    return team_logger


class TeamLoggerAdapter(logging.LoggerAdapter):
    """Adapter to add team context to log messages"""
    
    def __init__(self, logger, team_id: str = None, user_id: str = None):
        self.team_id = team_id
        self.user_id = user_id
        super().__init__(logger, {})
    
    def process(self, msg, kwargs):
        # Add team and user context to extra data
        extra = kwargs.get('extra', {})
        if self.team_id:
            extra['team_id'] = self.team_id
        if self.user_id:
            extra['user_id'] = self.user_id
        kwargs['extra'] = extra
        
        return msg, kwargs


def get_team_logger(team_id: str = None, user_id: str = None) -> TeamLoggerAdapter:
    """Get a team logger with context"""
    base_logger = logging.getLogger('teams')
    return TeamLoggerAdapter(base_logger, team_id, user_id)


def get_match_logger(match_id: str = None) -> logging.LoggerAdapter:
    """Get a match scoring logger with context"""
    base_logger = logging.getLogger('teams.match_scoring')
    return logging.LoggerAdapter(base_logger, {'match_id': match_id})


class PerformanceLogger:
    """Logger for performance monitoring of team operations"""
    
    def __init__(self, operation: str, team_id: str = None, user_id: str = None):
        self.operation = operation
        self.team_id = team_id
        self.user_id = user_id
        self.logger = get_team_logger(team_id, user_id)
        self.start_time = None
    
    def __enter__(self):
        from datetime import datetime
        self.start_time = datetime.now()
        self.logger.info(f"Starting operation: {self.operation}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        from datetime import datetime
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.info(
                f"Operation completed: {self.operation}",
                extra={'duration_seconds': duration, 'success': True}
            )
        else:
            self.logger.error(
                f"Operation failed: {self.operation} - {str(exc_val)}",
                extra={'duration_seconds': duration, 'success': False, 'error_type': exc_type.__name__}
            )


def log_api_request(request, view_name: str, team_id: str = None):
    """Log API request details for team endpoints"""
    logger = get_team_logger(team_id, str(request.user.id) if request.user.is_authenticated else None)
    
    request_data = {
        'view': view_name,
        'method': request.method,
        'path': request.path,
        'query_params': dict(request.GET),
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        'ip_address': get_client_ip(request)
    }
    
    logger.info(f"API request: {view_name}", extra=request_data)


def log_api_response(response, view_name: str, team_id: str = None, user_id: str = None):
    """Log API response details for team endpoints"""
    logger = get_team_logger(team_id, user_id)
    
    response_data = {
        'view': view_name,
        'status_code': response.status_code,
        'success': 200 <= response.status_code < 300
    }
    
    if hasattr(response, 'data') and isinstance(response.data, dict):
        response_data['has_errors'] = 'error' in response.data or 'errors' in response.data
    
    logger.info(f"API response: {view_name}", extra=response_data)


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Metrics and monitoring utilities

class TeamMetricsCollector:
    """Collect metrics for team operations"""
    
    @staticmethod
    def record_operation_metric(operation: str, success: bool, duration: float, 
                              team_id: str = None, user_id: str = None):
        """Record operation metrics"""
        logger = get_team_logger(team_id, user_id)
        
        metric_data = {
            'metric_type': 'operation',
            'operation': operation,
            'success': success,
            'duration_seconds': duration,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Operation metric: {operation}", extra=metric_data)
    
    @staticmethod
    def record_error_metric(error_type: str, error_code: str, operation: str = None,
                          team_id: str = None, user_id: str = None):
        """Record error metrics"""
        logger = get_team_logger(team_id, user_id)
        
        metric_data = {
            'metric_type': 'error',
            'error_type': error_type,
            'error_code': error_code,
            'operation': operation,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.error(f"Error metric: {error_type}", extra=metric_data)
    
    @staticmethod
    def record_usage_metric(resource: str, action: str, count: int = 1,
                          team_id: str = None, user_id: str = None):
        """Record usage metrics"""
        logger = get_team_logger(team_id, user_id)
        
        metric_data = {
            'metric_type': 'usage',
            'resource': resource,
            'action': action,
            'count': count,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Usage metric: {resource}.{action}", extra=metric_data)


# Health check utilities

def check_logging_health() -> Dict[str, Any]:
    """Check the health of the logging system"""
    health_status = {
        'status': 'healthy',
        'checks': {},
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Check if log directory exists and is writable
    log_dir = os.path.join(settings.BASE_DIR, 'logs')
    if os.path.exists(log_dir) and os.access(log_dir, os.W_OK):
        health_status['checks']['log_directory'] = 'healthy'
    else:
        health_status['checks']['log_directory'] = 'unhealthy'
        health_status['status'] = 'unhealthy'
    
    # Check if loggers are configured
    team_logger = logging.getLogger('teams')
    if team_logger.handlers:
        health_status['checks']['team_logger'] = 'healthy'
    else:
        health_status['checks']['team_logger'] = 'unhealthy'
        health_status['status'] = 'unhealthy'
    
    # Check log file sizes
    log_files = ['team_operations.log', 'team_errors.log', 'team_error_handlers.log']
    for log_file in log_files:
        log_path = os.path.join(log_dir, log_file)
        if os.path.exists(log_path):
            size_mb = os.path.getsize(log_path) / (1024 * 1024)
            health_status['checks'][f'{log_file}_size_mb'] = round(size_mb, 2)
        else:
            health_status['checks'][f'{log_file}_exists'] = False
    
    return health_status


# Initialize logging when module is imported
if not logging.getLogger('teams').handlers:
    setup_team_logging()