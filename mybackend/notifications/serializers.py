from rest_framework import serializers
from accounts.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    # Map backend field names to frontend expected names
    type = serializers.CharField(source='notification_type', read_only=True)
    is_read = serializers.BooleanField(source='read', read_only=True)
    priority = serializers.CharField(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 
            'type',  # Frontend expects 'type'
            'notification_type',  # Keep for backward compatibility
            'title', 
            'message', 
            'is_read',  # Frontend expects 'is_read'
            'read',  # Keep for backward compatibility
            'priority',
            'action_url',  # CRITICAL: Include action_url for navigation
            'created_at', 
            'tournament', 
            'related_id'
        ]
        read_only_fields = ['id', 'created_at', 'type', 'is_read', 'priority', 'action_url']
