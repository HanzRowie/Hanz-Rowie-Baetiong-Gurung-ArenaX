from rest_framework import serializers
from accounts.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'read', 'created_at', 'tournament', 'related_id']
        read_only_fields = ['id', 'created_at']
