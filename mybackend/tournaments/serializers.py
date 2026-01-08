from rest_framework import serializers
from django.utils import timezone
from .models import Tournament, TournamentRegistration, Match, RefereeBooking

# Tournament Serializer
class TournamentSerializer(serializers.ModelSerializer):
    organizer = serializers.SerializerMethodField()
    registered_count = serializers.SerializerMethodField()
    tournament_image = serializers.SerializerMethodField()
    is_registration_open = serializers.SerializerMethodField()
    user_registration_status = serializers.SerializerMethodField()
    registered_players = serializers.SerializerMethodField()
    matches = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'id', 'title', 'description', 'sport_type', 'tournament_type',
            'date', 'start_time', 'end_time', 'venue', 'venue_address',
            'linked_venue', 'venue_booking',  # Add new venue fields
            'entry_fee', 'max_participants', 'min_participants', 'registered_count',
            'registration_deadline', 'status', 'prize_pool', 'rules',
            'tournament_image', 'organizer', 'is_registration_open',
            'user_registration_status', 'registered_players', 'matches',
            'created_at', 'updated_at'
        ]

    def get_registered_count(self, obj):
        return obj.registrations.filter(status='ACCEPTED').count()

    def get_tournament_image(self, obj):
        if obj.tournament_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.tournament_image.url)
            return obj.tournament_image.url
        return None

    def get_organizer(self, obj):
        return {
            'id': str(obj.organizer.id),
            'name': obj.organizer.full_name,
            'profile_picture': obj.organizer.profile_picture.url if obj.organizer.profile_picture else None,
            'email': obj.organizer.email
        }

    def get_is_registration_open(self, obj):
        return (
            obj.status == 'UPCOMING' and
            timezone.now() < obj.registration_deadline and
            obj.registered_count < obj.max_participants
        )

    def get_user_registration_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        try:
            registration = TournamentRegistration.objects.get(
                tournament=obj,
                player=request.user
            )
            return registration.status
        except TournamentRegistration.DoesNotExist:
            return None

    def get_registered_players(self, obj):
        # Return basic info about registered players
        registrations = obj.registrations.filter(status='ACCEPTED').select_related('player')[:10]  # Limit to 10 for performance
        return [{
            'id': str(reg.player.id),
            'name': reg.player.full_name,
            'profile_picture': reg.player.profile_picture.url if reg.player.profile_picture else None,
            'registered_at': reg.registered_at.isoformat()
        } for reg in registrations]

    def get_matches(self, obj):
        # Return basic match info
        matches = obj.matches.all().order_by('round_number', 'match_number')[:20]  # Limit to 20 for performance
        return [{
            'id': str(match.id),
            'round_number': match.round_number,
            'match_number': match.match_number,
            'status': match.status,
            'scheduled_time': match.scheduled_time.isoformat() if match.scheduled_time else None
        } for match in matches]

# Tournament Registration Serializer
class TournamentRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentRegistration
        fields = '__all__'

# Match Serializer
class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = '__all__'

# Referee Booking Serializer
class RefereeBookingSerializer(serializers.ModelSerializer):
    referee_name = serializers.CharField(source='referee.full_name', read_only=True)
    match_details = serializers.SerializerMethodField()
    tournament_title = serializers.CharField(source='match.tournament.title', read_only=True)

    class Meta:
        model = RefereeBooking
        fields = ['id', 'referee', 'referee_name', 'match', 'match_details', 'tournament_title', 'requested_by', 'status', 'requested_at', 'responded_at', 'notes']

    def get_match_details(self, obj):
        return f"Round {obj.match.round_number}, Match {obj.match.match_number}"
