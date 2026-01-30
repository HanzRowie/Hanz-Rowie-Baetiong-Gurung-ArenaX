from django.db import models
import uuid

# CustomUser imported as string to avoid circular import

# Tournament
class Tournament(models.Model):
    STATUS_CHOICES = (
        ('UPCOMING', 'Upcoming'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    TOURNAMENT_TYPES = (
        ('SINGLE_ELIMINATION', 'Single Elimination'),
    )

    REGISTRATION_TYPES = (
        ('INDIVIDUAL', 'Individual'),
        ('TEAM', 'Team'),
    )

    SPORT_TYPES = (
        ('FUTSAL', 'Futsal'),
        ('BADMINTON', 'Badminton'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, limit_choices_to={'role': 'ORGANIZER'})
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sport_type = models.CharField(max_length=50, choices=SPORT_TYPES)
    tournament_type = models.CharField(max_length=20, choices=TOURNAMENT_TYPES, default='SINGLE_ELIMINATION')
    registration_type = models.CharField(max_length=15, choices=REGISTRATION_TYPES, default='INDIVIDUAL')
    
    # Team-specific requirements
    team_size = models.IntegerField(default=1, help_text="Required number of players per team")
    allow_substitutes = models.BooleanField(default=False)
    max_substitutes = models.IntegerField(default=0, help_text="Maximum number of substitute players allowed")
    
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    
    # Enhanced venue system - support both linked venues and custom venues
    venue = models.CharField(max_length=200)  # Keep for backward compatibility and custom venues
    venue_address = models.TextField(blank=True)
    linked_venue = models.ForeignKey('venues.Venue', on_delete=models.SET_NULL, null=True, blank=True, related_name='tournaments')
    venue_booking = models.ForeignKey('venues.VenueBooking', on_delete=models.SET_NULL, null=True, blank=True, related_name='tournament')
    
    entry_fee = models.DecimalField(max_digits=8, decimal_places=2)
    max_participants = models.IntegerField(default=16)
    min_participants = models.IntegerField(default=4)
    registration_deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPCOMING')
    prize_pool = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rules = models.TextField(blank=True)
    tournament_image = models.ImageField(upload_to='tournament_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.sport_type}"

    @property
    def registered_count(self):
        if self.registration_type == 'TEAM':
            return self.team_registrations.filter(status='CONFIRMED').count()
        else:
            return self.registrations.filter(status='ACCEPTED').count()

    @property
    def is_registration_open(self):
        from django.utils import timezone
        return (
            self.status == 'UPCOMING' and
            timezone.now() < self.registration_deadline and
            self.registered_count < self.max_participants
        )

    @property
    def venue_name(self):
        """Get venue name from linked venue or fallback to text field"""
        if self.linked_venue:
            return self.linked_venue.name
        return self.venue

    @property
    def venue_location(self):
        """Get venue location from linked venue or fallback to address field"""
        if self.linked_venue:
            return self.linked_venue.location
        return self.venue_address

    def get_sport_requirements(self):
        """Get sport-specific team composition requirements"""
        if self.sport_type == 'FUTSAL':
            return {
                'team_size': 5,
                'allow_substitutes': True,
                'max_substitutes': 10,
                'description': '5 players + up to 10 substitutes'
            }
        elif self.sport_type == 'BADMINTON':
            if self.registration_type == 'TEAM':
                return {
                    'team_size': 2,
                    'allow_substitutes': False,
                    'max_substitutes': 0,
                    'description': '2 players (doubles)'
                }
            else:
                return {
                    'team_size': 1,
                    'allow_substitutes': False,
                    'max_substitutes': 0,
                    'description': '1 player (singles)'
                }
        return {
            'team_size': self.team_size,
            'allow_substitutes': self.allow_substitutes,
            'max_substitutes': self.max_substitutes,
            'description': f'{self.team_size} players'
        }

    def validate_team_composition(self, selected_players_count):
        """Validate if team composition meets tournament requirements"""
        requirements = self.get_sport_requirements()
        
        if self.registration_type == 'INDIVIDUAL':
            return selected_players_count == 1
        
        # For team registration
        min_players = requirements['team_size']
        max_players = min_players + (requirements['max_substitutes'] if requirements['allow_substitutes'] else 0)
        
        return min_players <= selected_players_count <= max_players

# Tournament Registration
class TournamentRegistration(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='registrations')
    player = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, limit_choices_to={'role': 'PLAYER'})
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    registered_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('tournament', 'player')

    def __str__(self):
        return f"{self.player.full_name} - {self.tournament.title} ({self.status})"


# Match system for tournaments
class Match(models.Model):
    STATUS_CHOICES = (
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    round_number = models.IntegerField()
    match_number = models.IntegerField()
    
    # Individual player fields (for backward compatibility)
    player1 = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='matches_as_player1_tournaments', null=True, blank=True)
    player2 = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='matches_as_player2_tournaments', null=True, blank=True)
    winner = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, related_name='won_matches_tournaments', null=True, blank=True)
    
    # Team fields (for team tournaments)
    team1 = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='matches_as_team1', null=True, blank=True)
    team2 = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='matches_as_team2', null=True, blank=True)
    winning_team = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, related_name='won_matches', null=True, blank=True)
    
    player1_score = models.IntegerField(null=True, blank=True)
    player2_score = models.IntegerField(null=True, blank=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'round_number', 'match_number')
        ordering = ['round_number', 'match_number']

    def __str__(self):
        if self.tournament.registration_type == 'TEAM':
            team1_name = self.team1.name if self.team1 else "TBD"
            team2_name = self.team2.name if self.team2 else "TBD"
            return f"{self.tournament.title} - Round {self.round_number}, Match {self.match_number}: {team1_name} vs {team2_name}"
        else:
            p1_name = self.player1.full_name if self.player1 else "TBD"
            p2_name = self.player2.full_name if self.player2 else "TBD"
            return f"{self.tournament.title} - Round {self.round_number}, Match {self.match_number}: {p1_name} vs {p2_name}"

# Referee Booking Request
class RefereeBooking(models.Model):
    STATUS_CHOICES = (
        ('REQUESTED', 'Requested'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
    )

    referee = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='referee_bookings_tournaments', limit_choices_to={'role':'REFEREE'})
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='referee_bookings_tournaments')
    requested_by = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='referee_requests_tournaments', limit_choices_to={'role':'ORGANIZER'})
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='REQUESTED')
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('referee', 'match')

    def __str__(self):
        return f"Referee {self.referee.full_name} for Match {self.match.id} ({self.status})"
