from rest_framework import serializers
from .models import Message, ChatMessage, UserPresence, MessageAttachment, ConversationMetadata, GroupChat, GroupMessage, GroupMessageReadReceipt
from accounts.models import CustomUser


class UserPresenceSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = UserPresence
        fields = ['user_id', 'user_name', 'is_online', 'last_seen', 'last_activity']
        read_only_fields = ['last_seen', 'last_activity']


class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = [
            'id', 'file_type', 'file_name', 'file_size', 'mime_type',
            'file_url', 'thumbnail_url', 'duration', 'width', 'height', 'uploaded_at'
        ]
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


# Private Messaging Serializer - Enhanced
class MessageSerializer(serializers.ModelSerializer):
    is_from_me = serializers.SerializerMethodField()
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    receiver_name = serializers.CharField(source='receiver.full_name', read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    reply_to_message = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'content', 'message_type', 'status',
            'timestamp', 'delivered_at', 'read_at', 'edited', 'edited_at',
            'deleted', 'deleted_at', 'deleted_for_everyone', 'reply_to',
            'is_from_me', 'sender_name', 'sender_username', 'sender_avatar', 'receiver_name',
            'attachments', 'reply_to_message', 'can_edit', 'can_delete', 'read'
        ]
        read_only_fields = ['timestamp', 'delivered_at', 'read_at', 'edited_at', 'deleted_at']

    def get_is_from_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False
    
    def get_sender_avatar(self, obj):
        if obj.sender.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.sender.profile_picture.url)
            return obj.sender.profile_picture.url
        return None
    
    def get_reply_to_message(self, obj):
        if obj.reply_to:
            return {
                'id': str(obj.reply_to.id),
                'content': obj.reply_to.content,
                'sender_name': obj.reply_to.sender.full_name
            }
        return None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_edit(request.user)
        return False
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_delete(request.user)
        return False


# Chat Message Serializer
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'sender_username', 'content', 'timestamp']
        read_only_fields = ['timestamp']


class ConversationMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMetadata
        fields = [
            'other_user', 'is_archived', 'is_muted', 'is_pinned', 'is_blocked',
            'last_read_message', 'archived_at', 'muted_until'
        ]


class GroupMessageSerializer(serializers.ModelSerializer):
    """Serializer for group chat messages"""
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    reply_to_message = serializers.SerializerMethodField()
    read_by_count = serializers.SerializerMethodField()
    is_from_me = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMessage
        fields = [
            'id', 'group_chat', 'sender', 'sender_name', 'sender_username', 'sender_avatar',
            'content', 'message_type', 'status', 'timestamp', 'edited', 'edited_at',
            'deleted', 'deleted_at', 'reply_to', 'reply_to_message', 'read_by_count', 'is_from_me'
        ]
        read_only_fields = ['timestamp', 'edited_at', 'deleted_at']
    
    def get_sender_avatar(self, obj):
        if obj.sender.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.sender.profile_picture.url)
            return obj.sender.profile_picture.url
        return None
    
    def get_reply_to_message(self, obj):
        if obj.reply_to:
            return {
                'id': str(obj.reply_to.id),
                'content': obj.reply_to.content,
                'sender_name': obj.reply_to.sender.full_name
            }
        return None
    
    def get_read_by_count(self, obj):
        return obj.read_receipts.count()
    
    def get_is_from_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False


class GroupChatSerializer(serializers.ModelSerializer):
    """Serializer for group chat"""
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_id = serializers.UUIDField(source='team.id', read_only=True)
    recent_messages = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupChat
        fields = [
            'id', 'team_id', 'team_name', 'created_at', 'updated_at',
            'recent_messages', 'member_count'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_recent_messages(self, obj):
        # Get last 20 messages
        recent_messages = obj.messages.filter(deleted=False).order_by('-timestamp')[:20]
        # Reverse to show chronologically
        recent_messages = list(reversed(recent_messages))
        return GroupMessageSerializer(recent_messages, many=True, context=self.context).data
    
    def get_member_count(self, obj):
        from teams.models import TeamMembership
        return TeamMembership.objects.filter(team=obj.team, is_active=True).count()
