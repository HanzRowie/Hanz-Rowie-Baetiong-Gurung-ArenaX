from django.db import models

# Import CustomUser from core
from accounts.models import CustomUser

# Private Messaging
class Message(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages_chat')
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_messages_chat')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.full_name} to {self.receiver.full_name}: {self.content[:50]}"

# Global Chat Message
class ChatMessage(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_messages_chat')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.full_name}: {self.content[:50]}"
