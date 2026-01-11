from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'messages', views.MessageViewSet)
router.register(r'chat-messages', views.ChatMessageViewSet)

# URL patterns for chat app
urlpatterns = [
    path('conversations/<uuid:other_user_id>/', views.get_conversation, name='get_conversation'),
    path('conversations/<uuid:other_user_id>', views.get_conversation, name='get_conversation_no_slash'),
    path('messages/send/', views.send_message, name='send_message'),
    path('messages/send', views.send_message, name='send_message_no_slash'),
    path('conversations/', views.get_conversations, name='get_conversations'),
    path('conversations', views.get_conversations, name='get_conversations_no_slash'),
    path('messages/unread-count/', views.get_unread_count, name='get_unread_count'),
    path('messages/unread-count', views.get_unread_count, name='get_unread_count_no_slash'),
    path('conversations/<uuid:other_user_id>/mark-read/', views.mark_conversation_read, name='mark_conversation_read'),
    path('conversations/<uuid:other_user_id>/mark-read', views.mark_conversation_read, name='mark_conversation_read_no_slash'),
    path('conversations/<uuid:other_user_id>/delete/', views.delete_conversation, name='delete_conversation'),
    path('conversations/<uuid:other_user_id>/delete', views.delete_conversation, name='delete_conversation_no_slash'),
    path('messages/search/', views.search_messages, name='search_messages'),
    path('messages/search', views.search_messages, name='search_messages_no_slash'),
    path('', include(router.urls)),
]
