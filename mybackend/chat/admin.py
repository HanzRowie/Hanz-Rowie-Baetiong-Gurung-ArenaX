from django.contrib import admin
from .models import (
    Message, ChatMessage, UserPresence, MessageAttachment, ConversationMetadata,
    GroupChat, GroupMessage, GroupMessageReadReceipt, RefereeOrganizerRelationship
)


@admin.register(UserPresence)
class UserPresenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_online', 'last_seen', 'last_activity')
    list_filter = ('is_online',)
    search_fields = ('user__full_name', 'user__email')
    readonly_fields = ('last_seen', 'last_activity')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'message_type', 'status', 'timestamp', 'edited', 'deleted')
    list_filter = ('status', 'message_type', 'edited', 'deleted', 'timestamp')
    search_fields = ('sender__full_name', 'receiver__full_name', 'content')
    readonly_fields = ('id', 'timestamp', 'delivered_at', 'read_at', 'edited_at', 'deleted_at')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Message Info', {
            'fields': ('id', 'sender', 'receiver', 'content', 'message_type')
        }),
        ('Status', {
            'fields': ('status', 'timestamp', 'delivered_at', 'read_at', 'read')
        }),
        ('Editing & Deletion', {
            'fields': ('edited', 'edited_at', 'deleted', 'deleted_at', 'deleted_for_everyone')
        }),
        ('Threading', {
            'fields': ('reply_to',),
            'classes': ('collapse',)
        }),
    )


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('message', 'file_type', 'file_name', 'file_size_display', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('file_name', 'message__content')
    readonly_fields = ('id', 'uploaded_at', 'file_size_display')
    
    def file_size_display(self, obj):
        """Display file size in human-readable format"""
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    file_size_display.short_description = 'File Size'


@admin.register(ConversationMetadata)
class ConversationMetadataAdmin(admin.ModelAdmin):
    list_display = ('user', 'other_user', 'is_archived', 'is_muted', 'is_pinned', 'is_blocked')
    list_filter = ('is_archived', 'is_muted', 'is_pinned', 'is_blocked')
    search_fields = ('user__full_name', 'other_user__full_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'content_preview', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('sender__full_name', 'content')
    readonly_fields = ('timestamp',)
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'



@admin.register(GroupChat)
class GroupChatAdmin(admin.ModelAdmin):
    list_display = ('team', 'created_at', 'updated_at', 'message_count')
    search_fields = ('team__name',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    def message_count(self, obj):
        return obj.messages.count()
    message_count.short_description = 'Messages'


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'group_chat', 'message_type', 'status', 'timestamp', 'edited', 'deleted')
    list_filter = ('status', 'message_type', 'edited', 'deleted', 'timestamp')
    search_fields = ('sender__full_name', 'content', 'group_chat__team__name')
    readonly_fields = ('id', 'timestamp', 'edited_at', 'deleted_at')
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Message Info', {
            'fields': ('id', 'group_chat', 'sender', 'content', 'message_type')
        }),
        ('Status', {
            'fields': ('status', 'timestamp')
        }),
        ('Editing & Deletion', {
            'fields': ('edited', 'edited_at', 'deleted', 'deleted_at')
        }),
        ('Threading', {
            'fields': ('reply_to',),
            'classes': ('collapse',)
        }),
    )


@admin.register(GroupMessageReadReceipt)
class GroupMessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'read_at')
    list_filter = ('read_at',)
    search_fields = ('user__full_name', 'message__content')
    readonly_fields = ('id', 'read_at')
    date_hierarchy = 'read_at'


@admin.register(RefereeOrganizerRelationship)
class RefereeOrganizerRelationshipAdmin(admin.ModelAdmin):
    list_display = ('referee', 'organizer', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('referee__full_name', 'organizer__full_name')
    readonly_fields = ('id', 'created_at')
    date_hierarchy = 'created_at'
