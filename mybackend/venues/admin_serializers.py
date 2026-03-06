"""
Admin Venue Serializers
Serializers for admin venue management with approval workflow fields.
"""
from rest_framework import serializers
from .models import Venue, VenueAuditLog
from accounts.models import CustomUser


class AdminVenueOwnerSerializer(serializers.ModelSerializer):
    """Serializer for venue owner information in admin views."""
    
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'phone_number', 'approval_status']


class AdminVenueAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for venue audit log entries."""
    
    administrator_name = serializers.CharField(source='administrator.full_name', read_only=True)
    
    class Meta:
        model = VenueAuditLog
        fields = [
            'id',
            'administrator',
            'administrator_name',
            'action_type',
            'previous_status',
            'new_status',
            'reason',
            'metadata',
            'timestamp'
        ]


class AdminVenueListSerializer(serializers.ModelSerializer):
    """
    Serializer for venue list view in admin panel.
    Includes essential fields for table display.
    """
    
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    submission_date = serializers.DateTimeField(source='created_at', read_only=True)
    address = serializers.CharField(source='location', read_only=True)
    
    class Meta:
        model = Venue
        fields = [
            'id',
            'name',
            'location',
            'address',
            'sport_type',
            'owner',
            'owner_name',
            'owner_email',
            'approval_status',
            'approval_date',
            'approved_by',
            'approved_by_name',
            'capacity',
            'price_per_hour',
            'is_active',
            'submission_date',
        ]


class AdminVenueDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for venue detail view in admin panel.
    Includes all fields including approval workflow and audit logs.
    """
    
    owner_details = AdminVenueOwnerSerializer(source='owner', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    audit_logs = AdminVenueAuditLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = Venue
        fields = [
            'id',
            'name',
            'location',
            'sport_type',
            'court_size',
            'facilities',
            'capacity',
            'price_per_hour',
            'image',
            'is_active',
            'default_opening_time',
            'default_closing_time',
            'operating_days',
            # Approval workflow fields
            'approval_status',
            'approval_date',
            'approved_by',
            'approved_by_name',
            'rejection_reason',
            'approval_notes',
            'verification_documents',
            'requested_documents',
            # Related data
            'owner',
            'owner_details',
            'audit_logs',
        ]
