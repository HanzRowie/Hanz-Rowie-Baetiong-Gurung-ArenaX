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
    sport_requirements = serializers.SerializerMethodField()

    participation_type = serializers.CharField(source='registration_type', read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'id', 'title', 'description', 'sport_type', 'tournament_type',
            'registration_type', 'participation_type', 'team_size', 'allow_substitutes', 'max_substitutes',
            'date', 'start_time', 'end_time', 'venue', 'venue_address',
            'linked_venue', 'venue_booking',  # Add new venue fields
            'entry_fee', 'max_participants', 'min_participants', 'registered_count',
            'registration_deadline', 'status', 'prize_pool', 'rules',
            'tournament_image', 'organizer', 'is_registration_open',
            'user_registration_status', 'registered_players', 'matches',
            'sport_requirements', 'created_at', 'updated_at'
        ]

    def get_registered_count(self, obj):
        if obj.registration_type == 'TEAM':
            return obj.team_registrations.filter(status='CONFIRMED').count()
        else:
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

    def get_sport_requirements(self, obj):
        """Get sport-specific requirements for the tournament"""
        return obj.get_sport_requirements()

    def get_user_registration_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        if obj.registration_type == 'TEAM':
            # Check if user's teams are registered for this tournament
            from teams.models import TeamTournamentRegistration, TeamMembership
            user_teams = TeamMembership.objects.filter(
                player=request.user, 
                is_active=True
            ).values_list('team_id', flat=True)
            
            team_registration = TeamTournamentRegistration.objects.filter(
                tournament=obj,
                team_id__in=user_teams
            ).first()
            
            return team_registration.status if team_registration else None
        else:
            # Individual registration (existing logic)
            try:
                registration = TournamentRegistration.objects.get(
                    tournament=obj,
                    player=request.user
                )
                return registration.status
            except TournamentRegistration.DoesNotExist:
                return None

    def get_registered_players(self, obj):
        if obj.registration_type == 'TEAM':
            # Return basic info about registered teams
            from teams.models import TeamTournamentRegistration
            team_registrations = TeamTournamentRegistration.objects.filter(
                tournament=obj, 
                status='CONFIRMED'
            ).select_related('team')[:10]  # Limit to 10 for performance
            
            return [{
                'id': str(reg.team.id),
                'name': reg.team.name,
                'type': 'team',
                'sport_types': reg.team.sport_types,
                'member_count': reg.selected_player_count,
                'registered_at': reg.registered_at.isoformat()
            } for reg in team_registrations]
        else:
            # Return basic info about registered players (existing logic)
            registrations = obj.registrations.filter(status='ACCEPTED').select_related('player')[:10]  # Limit to 10 for performance
            return [{
                'id': str(reg.player.id),
                'name': reg.player.full_name,
                'type': 'individual',
                'profile_picture': reg.player.profile_picture.url if reg.player.profile_picture else None,
                'registered_at': reg.registered_at.isoformat()
            } for reg in registrations]

    def get_matches(self, obj):
        # Return detailed match info with participants
        matches = obj.matches.all().order_by('round_number', 'match_number')
        return MatchSerializer(matches, many=True, context=self.context).data

# Tournament Registration Serializer
class TournamentRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentRegistration
        fields = '__all__'

# Match Serializer
class MatchSerializer(serializers.ModelSerializer):
    player1 = serializers.SerializerMethodField()
    player2 = serializers.SerializerMethodField()
    team1 = serializers.SerializerMethodField()
    team2 = serializers.SerializerMethodField()
    winner = serializers.SerializerMethodField()
    team1_score = serializers.SerializerMethodField()
    team2_score = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'round_number', 'match_number', 'status', 'scheduled_time',
            'player1', 'player2', 'team1', 'team2', 'winner',
            'player1_score', 'player2_score', 'team1_score', 'team2_score',
            'actual_start_time', 'actual_end_time', 'notes'
        ]

    def get_player1(self, obj):
        if obj.player1:
            return {
                'id': str(obj.player1.id),
                'name': obj.player1.full_name,
                'profile_picture': obj.player1.profile_picture.url if obj.player1.profile_picture else None
            }
        return None

    def get_player2(self, obj):
        if obj.player2:
            return {
                'id': str(obj.player2.id),
                'name': obj.player2.full_name,
                'profile_picture': obj.player2.profile_picture.url if obj.player2.profile_picture else None
            }
        return None

    def get_team1(self, obj):
        if obj.team1:
            return {
                'id': str(obj.team1.id),
                'name': obj.team1.name
            }
        return None

    def get_team2(self, obj):
        if obj.team2:
            return {
                'id': str(obj.team2.id),
                'name': obj.team2.name
            }
        return None

    def get_team1_score(self, obj):
        # For team tournaments, team1_score is stored in player1_score
        return obj.player1_score if obj.tournament.registration_type == 'TEAM' else None

    def get_team2_score(self, obj):
        # For team tournaments, team2_score is stored in player2_score
        return obj.player2_score if obj.tournament.registration_type == 'TEAM' else None

    def get_winner(self, obj):
        if obj.tournament.registration_type == 'TEAM' and obj.winning_team:
            return {
                'id': str(obj.winning_team.id),
                'name': obj.winning_team.name,
                'type': 'TEAM'
            }
        elif obj.tournament.registration_type == 'INDIVIDUAL' and obj.winner:
            return {
                'id': str(obj.winner.id),
                'name': obj.winner.full_name,
                'type': 'PLAYER'
            }
        return None

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


# Team Tournament Registration Serializer
class TeamTournamentRegistrationSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    tournament = serializers.UUIDField()
    tournament_title = serializers.CharField(read_only=True)
    team = serializers.UUIDField()
    team_name = serializers.CharField(read_only=True)
    selected_players = serializers.ListField(child=serializers.UUIDField())
    selected_players_details = serializers.SerializerMethodField()
    registered_by = serializers.UUIDField(read_only=True)
    registered_by_name = serializers.CharField(read_only=True)
    registered_at = serializers.DateTimeField(read_only=True)
    status = serializers.CharField(read_only=True)

    def get_selected_players_details(self, obj):
        """Get detailed information about selected players"""
        if hasattr(obj, 'selected_players'):
            return [{
                'id': str(player.id),
                'name': player.full_name,
                'profile_picture': player.profile_picture.url if player.profile_picture else None
            } for player in obj.selected_players.all()]
        return []
