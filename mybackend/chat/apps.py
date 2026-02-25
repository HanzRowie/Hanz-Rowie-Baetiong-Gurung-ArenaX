from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chat"
    
    def ready(self):
        """Import signal handlers when the app is ready"""
        import chat.signals  # noqa: F401
