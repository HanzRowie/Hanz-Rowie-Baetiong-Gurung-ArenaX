from django.urls import re_path
from chat.consumers import ChatConsumer, DirectChatConsumer, GroupChatConsumer
from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    # New cross-role direct messaging (MUST come before legacy pattern)
    re_path(r'ws/chat/direct/$', DirectChatConsumer.as_asgi()),
    # Team group chat
    re_path(r'ws/chat/group/(?P<team_id>[^/]+)/$', GroupChatConsumer.as_asgi()),
    # Legacy player-to-player chat (kept for backward compatibility)
    # This pattern is more general, so it must come AFTER specific patterns
    re_path(r'ws/chat/(?P<user_id>[^/]+)/$', ChatConsumer.as_asgi()),
    # Notifications
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]
