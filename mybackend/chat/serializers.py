from rest_framework import serializers
from .models import Message, ChatMessage

# Private Messaging Serializer
class MessageSerializer(serializers.ModelSerializer):
    is_from_me = serializers.SerializerMethodField()
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'timestamp', 'read', 'is_from_me', 'sender_name', 'sender_username']

    def get_is_from_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False

# Chat Message Serializer
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'sender_username', 'content', 'timestamp']
