from rest_framework import serializers
from .models import (
    RefereeProfile, RefereeAvailability, RefereeBooking,
    RefereeRating, RefereeCertification, RefereeMatchReport,
    RefereeGeneralAvailability
)

class RefereeProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = RefereeProfile
        fields = '__all__'

class RefereeGeneralAvailabilitySerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)

    class Meta:
        model = RefereeGeneralAvailability
        fields = '__all__'
        read_only_fields = ('referee',)

class RefereeAvailabilitySerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)

    class Meta:
        model = RefereeAvailability
        fields = '__all__'
        read_only_fields = ('referee',)  # Referee is set automatically in the view

class RefereeBookingSerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    match_details = serializers.SerializerMethodField()
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)
    
    # Add detailed tournament information
    tournament = serializers.SerializerMethodField()
    match = serializers.SerializerMethodField()
    requested_by = serializers.SerializerMethodField()

    class Meta:
        model = RefereeBooking
        fields = '__all__'

    def get_match_details(self, obj):
        if not obj.match:
            return None
        return f"Round {obj.match.round_number}, Match {obj.match.match_number}"
    
    def get_tournament(self, obj):
        return {
            'id': str(obj.tournament.id),
            'title': obj.tournament.title,
            'sport_type': obj.tournament.sport_type,
            'venue_name': obj.tournament.venue_name,  # Use property instead of direct access
            'venue_location': obj.tournament.venue_location,  # Use property instead of direct access
            'date': str(obj.tournament.date),
            'start_time': str(obj.tournament.start_time) if obj.tournament.start_time else None,
            'end_time': str(obj.tournament.end_time) if obj.tournament.end_time else None,
        }
    
    def get_match(self, obj):
        if not obj.match:
            return None
        return {
            'id': str(obj.match.id),
            'round_number': obj.match.round_number,
            'match_number': obj.match.match_number,
            'scheduled_time': obj.match.scheduled_time.isoformat() if obj.match.scheduled_time else None,
        }
    
    def get_requested_by(self, obj):
        return {
            'id': str(obj.requested_by.id),
            'full_name': obj.requested_by.full_name,
            'email': obj.requested_by.email,
            'phone_number': obj.requested_by.phone_number,
        }

class RefereeRatingSerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)

    class Meta:
        model = RefereeRating
        fields = '__all__'

class RefereeCertificationSerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)

    class Meta:
        model = RefereeCertification
        fields = '__all__'

class RefereeMatchReportSerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)
    match_details = serializers.SerializerMethodField()

    class Meta:
        model = RefereeMatchReport
        fields = '__all__'

    def get_match_details(self, obj):
        if not obj.match:
            return None
        return f"Round {obj.match.round_number}, Match {obj.match.match_number}"
