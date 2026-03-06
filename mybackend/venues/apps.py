from django.apps import AppConfig


class VenuesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "venues"
    
    def ready(self):
        """Import signal handlers when app is ready."""
        import venues.signals  # noqa
