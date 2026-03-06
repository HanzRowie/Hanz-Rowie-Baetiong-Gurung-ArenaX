"""
Admin Tournament Serializers
Serializers for admin tournament management with approval workflow fields.
"""
from rest_framework import serializers
from .models import Tournament, TournamentAuditLog
from accounts.models import CustomUser


class AdminTournamentOrganizerSerializer(serializers.ModelSerializer):
    """Serializer for organizer information in admin views."""
    
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'email', 'phone_number', 'approval_status']


class AdminTournamentAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for tournament audit log entries."""
    
    administrator_name = serializers.CharField(source='administrator.full_name', read_only=True)
    
    class Meta:
        model = TournamentAuditLog
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


class AdminTournamentListSerializer(serializers.ModelSerializer):
    """
    Serializer for tournament list view in admin panel.
    Includes essential fields for table display.
    """
    
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    organizer_email = serializers.CharField(source='organizer.email', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    venue_display_name = serializers.CharField(source='venue_name', read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    submission_date = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Tournament
        fields = [
            'id',
            'title',
            'sport_type',
            'tournament_type',
            'date',
            'start_time',
            'venue_display_name',
            'organizer',
            'organizer_name',
            'organizer_email',
            'approval_status',
            'approval_date',
            'approved_by',
            'approved_by_name',
            'registered_count',
            'max_participants',
            'created_at',
            'submission_date',
        ]


class AdminTournamentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for tournament detail view in admin panel.
    Includes all fields including approval workflow and audit logs.
    """
    
    organizer_details = AdminTournamentOrganizerSerializer(source='organizer', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)
    audit_logs = AdminTournamentAuditLogSerializer(many=True, read_only=True)
    venue_display_name = serializers.CharField(source='venue_name', read_only=True)
    venue_display_location = serializers.CharField(source='venue_location', read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    is_registration_open = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Tournament
        fields = [
            'id',
            'title',
            'description',
            'sport_type',
            'tournament_type',
            'registration_type',
            'team_size',
            'allow_substitutes',
            'max_substitutes',
            'date',
            'start_time',
            'end_time',
            'venue',
            'venue_address',
            'venue_display_name',
            'venue_display_location',
            'linked_venue',
            'venue_booking',
            'entry_fee',
            'max_participants',
            'min_participants',
            'registration_deadline',
            'status',
            'prize_pool',
            'rules',
            'tournament_image',
            'created_at',
            'updated_at',
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
            'organizer',
            'organizer_details',
            'registered_count',
            'is_registration_open',
            'audit_logs',
        ]
