from django.urls import re_path
from chat.consumers import ChatConsumer, DirectChatConsumer, GroupChatConsumer
from notifications.consumers import NotificationConsumer
from accounts.consumers import AdminDashboardConsumer

websocket_urlpatterns = [
    # Admin dashboard real-time updates
    re_path(r'ws/admin/dashboard/$', AdminDashboardConsumer.as_asgi()),
    # New cross-role direct messaging (MUST come before legacy pattern)
    re_path(r'ws/chat/direct/(?P<other_user_id>[^/]+)/$', DirectChatConsumer.as_asgi()),
    # Team group chat
    re_path(r'ws/chat/group/(?P<team_id>[^/]+)/$', GroupChatConsumer.as_asgi()),
    # Legacy player-to-player chat (kept for backward compatibility)
    # This pattern is more general, so it must come AFTER specific patterns
    re_path(r'ws/chat/(?P<user_id>[^/]+)/$', ChatConsumer.as_asgi()),
    # Notifications
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]
