from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'messages', views.MessageViewSet)
router.register(r'chat-messages', views.ChatMessageViewSet)

# URL patterns for chat app
urlpatterns = [
    path('messages/', views.get_messages, name='get_messages'),
    path('messages', views.get_messages, name='get_messages_no_slash'),
    path('conversations/<uuid:other_user_id>/', views.get_conversation, name='get_conversation'),
    path('conversations/<uuid:other_user_id>', views.get_conversation, name='get_conversation_no_slash'),
    path('conversations/create/', views.create_conversation, name='create_conversation'),
    path('conversations/create', views.create_conversation, name='create_conversation_no_slash'),
    # POST /api/chat/messages/ for sending messages
    # path('messages/send/', views.send_message, name='send_message'),
    # path('messages/send', views.send_message, name='send_message_no_slash'),
    path('conversations/', views.get_conversations, name='get_conversations'),
    path('conversations', views.get_conversations, name='get_conversations_no_slash'),
    path('messages/<uuid:message_id>/', views.edit_message, name='edit_message'),
    path('messages/<uuid:message_id>', views.edit_message, name='edit_message_no_slash'),
    path('messages/unread-count/', views.get_unread_count, name='get_unread_count'),
    path('messages/unread-count', views.get_unread_count, name='get_unread_count_no_slash'),
    path('conversations/<uuid:other_user_id>/mark-read/', views.mark_conversation_read, name='mark_conversation_read'),
    path('conversations/<uuid:other_user_id>/mark-read', views.mark_conversation_read, name='mark_conversation_read_no_slash'),
    path('conversations/<uuid:other_user_id>/delete/', views.delete_conversation, name='delete_conversation'),
    path('conversations/<uuid:other_user_id>/delete', views.delete_conversation, name='delete_conversation_no_slash'),
    path('messages/search/', views.search_messages, name='search_messages'),
    path('messages/search', views.search_messages, name='search_messages_no_slash'),
    
    # Phase 2: Real-Time Features
    # Bulk presence must come before <uuid:user_id> to avoid routing conflicts
    path('presence/bulk/', views.get_multiple_presence, name='get_multiple_presence'),
    path('presence/bulk', views.get_multiple_presence, name='get_multiple_presence_no_slash'),
    path('presence/<uuid:user_id>/', views.get_user_presence, name='get_user_presence'),
    path('presence/<uuid:user_id>', views.get_user_presence, name='get_user_presence_no_slash'),
    path('messages/bulk-mark-delivered/', views.bulk_mark_delivered, name='bulk_mark_delivered'),
    path('messages/bulk-mark-delivered', views.bulk_mark_delivered, name='bulk_mark_delivered_no_slash'),
    path('messages/bulk-mark-read/', views.bulk_mark_read, name='bulk_mark_read'),
    path('messages/bulk-mark-read', views.bulk_mark_read, name='bulk_mark_read_no_slash'),
    path('messages/<uuid:message_id>/status/', views.get_message_status, name='get_message_status'),
    path('messages/<uuid:message_id>/status', views.get_message_status, name='get_message_status_no_slash'),
    
    # Group Chat Endpoints
    path('groups/<uuid:team_id>/', views.get_group_chat, name='get_group_chat'),
    path('groups/<uuid:team_id>', views.get_group_chat, name='get_group_chat_no_slash'),
    path('groups/<uuid:team_id>/messages/', views.get_group_messages, name='get_group_messages'),
    path('groups/<uuid:team_id>/messages', views.get_group_messages, name='get_group_messages_no_slash'),
    path('groups/<uuid:team_id>/messages/send/', views.send_group_message, name='send_group_message'),
    path('groups/<uuid:team_id>/messages/send', views.send_group_message, name='send_group_message_no_slash'),
    path('groups/<uuid:team_id>/mark-read/', views.mark_group_messages_read, name='mark_group_messages_read'),
    path('groups/<uuid:team_id>/mark-read', views.mark_group_messages_read, name='mark_group_messages_read_no_slash'),
    
    path('', include(router.urls)),
]
