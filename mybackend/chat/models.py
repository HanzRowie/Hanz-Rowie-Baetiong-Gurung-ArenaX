from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid

# Import CustomUser from core
from accounts.models import CustomUser


class UserPresence(models.Model):
    """Track user online/offline status"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='presence')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now=True)
    device_info = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'chat_user_presence'
        verbose_name = 'User Presence'
        verbose_name_plural = 'User Presences'
        indexes = [
            models.Index(fields=['is_online', 'last_seen'], name='chat_presence_online_idx'),
        ]
    
    def __str__(self):
        status = "Online" if self.is_online else f"Last seen {self.last_seen}"
        return f"{self.user.full_name} - {status}"


# Private Messaging - Enhanced
class Message(models.Model):
    """Enhanced message model with status tracking"""
    STATUS_CHOICES = (
        ('SENDING', 'Sending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('READ', 'Read'),
        ('FAILED', 'Failed'),
    )
    
    MESSAGE_TYPE_CHOICES = (
        ('TEXT', 'Text'),
        ('IMAGE', 'Image'),
        ('VIDEO', 'Video'),
        ('AUDIO', 'Audio'),
        ('DOCUMENT', 'Document'),
        ('VOICE', 'Voice Message'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages_chat')
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_messages_chat')
    content = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='TEXT')
    
    # Status tracking
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='SENT')
    timestamp = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Editing and deletion
    edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_for_everyone = models.BooleanField(default=False)
    
    # Threading (optional)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    # Legacy field for backward compatibility
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['sender', 'receiver', '-timestamp'], name='chat_msg_sr_ts_idx'),
            models.Index(fields=['receiver', 'read', '-timestamp'], name='chat_msg_unread_idx'),
        ]

    def __str__(self):
        return f"{self.sender.full_name} to {self.receiver.full_name}: {self.content[:50]}"
    
    def mark_as_delivered(self):
        """Mark message as delivered"""
        if self.status == 'SENT':
            self.status = 'DELIVERED'
            self.delivered_at = timezone.now()
            self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_read(self):
        """Mark message as read"""
        if self.status in ['SENT', 'DELIVERED']:
            self.status = 'READ'
            self.read_at = timezone.now()
            self.read = True
            self.save(update_fields=['status', 'read_at', 'read'])
    
    def can_edit(self, user):
        """Check if user can edit this message"""
        if self.sender != user:
            return False
        if self.deleted:
            return False
        # Allow editing within 15 minutes
        time_limit = timezone.now() - timezone.timedelta(minutes=15)
        return self.timestamp > time_limit
    
    def can_delete(self, user):
        """Check if user can delete this message"""
        return self.sender == user or self.receiver == user


class MessageAttachment(models.Model):
    """File attachments for messages"""
    ATTACHMENT_TYPE_CHOICES = (
        ('IMAGE', 'Image'),
        ('VIDEO', 'Video'),
        ('AUDIO', 'Audio'),
        ('DOCUMENT', 'Document'),
        ('VOICE', 'Voice Message'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='chat_attachments/%Y/%m/%d/')
    file_type = models.CharField(max_length=10, choices=ATTACHMENT_TYPE_CHOICES)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    thumbnail = models.ImageField(upload_to='chat_thumbnails/%Y/%m/%d/', null=True, blank=True)
    
    # Media metadata
    duration = models.IntegerField(null=True, blank=True)  # For audio/video in seconds
    width = models.IntegerField(null=True, blank=True)  # For images/video
    height = models.IntegerField(null=True, blank=True)  # For images/video
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_message_attachments'
        ordering = ['uploaded_at']
        indexes = [
            models.Index(fields=['message', 'file_type'], name='chat_attach_msg_type_idx'),
        ]
    
    def __str__(self):
        return f"{self.file_type}: {self.file_name}"


class ConversationMetadata(models.Model):
    """Metadata for conversations (archiving, muting, etc.)"""
    CONVERSATION_TYPE_CHOICES = (
        ('DIRECT', 'Direct'),
        ('GROUP', 'Group'),
    )
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='conversation_metadata')
    other_user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='conversation_metadata_reverse')
    conversation_type = models.CharField(
        max_length=10,
        choices=CONVERSATION_TYPE_CHOICES,
        default='DIRECT'
    )
    
    is_archived = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    
    last_read_message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    muted_until = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_conversation_metadata'
        unique_together = [('user', 'other_user')]
    
    def __str__(self):
        return f"{self.user.full_name} <-> {self.other_user.full_name}"


# Global Chat Message - Keep for backward compatibility
class ChatMessage(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_messages_chat')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.full_name}: {self.content[:50]}"


# Multi-User Chat System Models

class GroupChat(models.Model):
    """Team-based group chat"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.OneToOneField('teams.Team', on_delete=models.CASCADE, related_name='group_chat')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_group_chats'
        indexes = [
            models.Index(fields=['team'], name='chat_grp_team_idx'),
        ]
    
    def __str__(self):
        return f"Group Chat for {self.team.name}"


class GroupMessage(models.Model):
    """Messages in group chats"""
    STATUS_CHOICES = (
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    )
    
    MESSAGE_TYPE_CHOICES = (
        ('TEXT', 'Text'),
        ('IMAGE', 'Image'),
        ('VIDEO', 'Video'),
        ('AUDIO', 'Audio'),
        ('DOCUMENT', 'Document'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group_chat = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_group_messages')
    content = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default='TEXT')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='SENT')
    timestamp = models.DateTimeField(auto_now_add=True)
    edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    class Meta:
        db_table = 'chat_group_messages'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['group_chat', '-timestamp'], name='chat_grp_msg_chat_ts_idx'),
            models.Index(fields=['sender', '-timestamp'], name='chat_grp_msg_sender_ts_idx'),
        ]
    
    def __str__(self):
        return f"{self.sender.full_name} in {self.group_chat}: {self.content[:50]}"


class GroupMessageReadReceipt(models.Model):
    """Track read status for group messages per user"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(GroupMessage, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='group_message_receipts')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_group_message_read_receipts'
        unique_together = [('message', 'user')]
        indexes = [
            models.Index(fields=['message', 'user'], name='chat_grp_rcpt_msg_usr_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.full_name} read message {self.message.id}"


class RefereeOrganizerRelationship(models.Model):
    """Tracks referee-organizer relationships for chat access control"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referee = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='organizer_relationships',
        limit_choices_to={'role': 'REFEREE'}
    )
    organizer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='referee_relationships',
        limit_choices_to={'role': 'ORGANIZER'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_referee_organizer_relationships'
        unique_together = [('referee', 'organizer')]
        indexes = [
            models.Index(fields=['referee', 'organizer'], name='chat_ref_org_idx'),
            models.Index(fields=['organizer', 'referee'], name='chat_org_ref_idx'),
        ]
    
    def __str__(self):
        return f"{self.referee.full_name} <-> {self.organizer.full_name}"
