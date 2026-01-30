from django.apps import AppConfig


class TeamsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = "teams"

    def ready(self):
        """Initialize team error handling, logging, and monitoring systems"""
        # Import and initialize logging
        from .logging_config import setup_team_logging
        setup_team_logging()
        
        # Import and initialize monitoring
        from .monitoring import setup_team_monitoring
        setup_team_monitoring()
        
        # Import error handlers to ensure they're loaded
        from . import error_handlers
        from . import exceptions
        
        # Log successful initialization
        import logging
        logger = logging.getLogger('teams')
        logger.info("Team-based tournament system error handling initialized successfully")
