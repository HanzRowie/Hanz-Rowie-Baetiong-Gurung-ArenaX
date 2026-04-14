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
        ('knockout', 'Knockout'),
        ('league', 'League'),
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
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, null=True, blank=True)
    organizer = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, limit_choices_to={'role': 'ORGANIZER'})
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sport_type = models.CharField(max_length=50, choices=SPORT_TYPES)
    tournament_type = models.CharField(max_length=20, choices=TOURNAMENT_TYPES, default='knockout', db_index=True)
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
    
    # Approval Workflow Fields
    APPROVAL_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CONDITIONAL_APPROVAL', 'Conditional Approval'),
    )
    
    approval_status = models.CharField(
        max_length=25,
        choices=APPROVAL_STATUS_CHOICES,
        default='PENDING',
        db_index=True,
        help_text='Current approval status of the tournament'
    )
    
    approval_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when the tournament was approved or rejected'
    )
    
    approved_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_tournaments',
        help_text='Administrator who approved or rejected this tournament'
    )
    
    rejection_reason = models.TextField(
        blank=True,
        help_text='Explanation provided when tournament is rejected'
    )
    
    approval_notes = models.TextField(
        blank=True,
        help_text='Optional notes from admin during approval'
    )
    
    verification_documents = models.JSONField(
        default=dict,
        blank=True,
        help_text='JSON storage of document references with type and URL'
    )
    
    requested_documents = models.JSONField(
        default=list,
        blank=True,
        help_text='List of documents requested for conditional approval'
    )

    class Meta:
        indexes = [
            models.Index(fields=['approval_status', 'created_at']),
            models.Index(fields=['sport_type', 'approval_status']),
            models.Index(fields=['organizer', 'approval_status']),
            models.Index(fields=['date', 'approval_status']),
        ]

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
        from datetime import datetime
        tournament_start = datetime.combine(self.date, self.start_time)
        aware_start = timezone.make_aware(tournament_start) if timezone.is_naive(tournament_start) else tournament_start
        return (
            self.status == 'UPCOMING' and
            self.approval_status == 'APPROVED' and
            timezone.now() < self.registration_deadline and
            timezone.now() < aware_start and
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
    
    def clean(self):
        """Validate model fields before saving"""
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        from datetime import datetime
        
        # Validate that Futsal tournaments are always team-based
        if self.sport_type == 'FUTSAL' and self.registration_type == 'INDIVIDUAL':
            raise ValidationError({
                'registration_type': 'Futsal tournaments must be team-based. Please select TEAM registration type.'
            })
        
        # Validate registration deadline is before tournament start
        if self.registration_deadline and self.date and self.start_time:
            tournament_start = datetime.combine(self.date, self.start_time)
            aware_start = timezone.make_aware(tournament_start) if timezone.is_naive(tournament_start) else tournament_start
            if self.registration_deadline >= aware_start:
                raise ValidationError({
                    'registration_deadline': 'Registration deadline must be before the tournament start date and time.'
                })
        
        # Validate tournament_type is one of the allowed values
        valid_types = ['knockout', 'league', 'SINGLE_ELIMINATION']
        if self.tournament_type and self.tournament_type not in valid_types:
            raise ValidationError({
                'tournament_type': f'Invalid tournament type. Must be one of: {", ".join(valid_types)}'
            })
        
        # Prevent tournament type change if matches exist
        if self.pk:  # Only check for existing tournaments
            try:
                old_instance = Tournament.objects.get(pk=self.pk)
                if old_instance.tournament_type != self.tournament_type:
                    # Check if matches exist
                    if Match.objects.filter(tournament=self).exists():
                        raise ValidationError({
                            'tournament_type': 'Cannot change tournament type after matches have been created.'
                        })
            except Tournament.DoesNotExist:
                pass
        
        # Validate min_participants is at least 2
        if self.min_participants < 2:
            raise ValidationError({
                'min_participants': 'Minimum participants must be at least 2.'
            })
        
        # Validate max_participants >= min_participants
        if self.max_participants < self.min_participants:
            raise ValidationError({
                'max_participants': 'Maximum participants must be greater than or equal to minimum participants.'
            })
        
        super().clean()

# Tournament Registration
class TournamentRegistration(models.Model):
    STATUS_CHOICES = (
        ('PENDING_PAYMENT', 'Pending Payment'),
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='registrations')
    player = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, limit_choices_to={'role': 'PLAYER'})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    registered_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    # Payment integration
    payment = models.ForeignKey(
        'payments.Payment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tournament_registrations'
    )
    payment_verified_at = models.DateTimeField(null=True, blank=True)

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
    
    # Per-match venue (for league tournaments where each match may be at a different venue)
    match_venue = models.ForeignKey('venues.Venue', on_delete=models.SET_NULL, null=True, blank=True, related_name='hosted_matches')
    match_venue_name = models.CharField(max_length=200, blank=True, help_text='Custom venue name if not using a linked venue')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'round_number', 'match_number')
        ordering = ['round_number', 'match_number']
        indexes = [
            models.Index(fields=['tournament', 'round_number']),
        ]

    def __str__(self):
        if self.tournament.registration_type == 'TEAM':
            team1_name = self.team1.name if self.team1 else "TBD"
            team2_name = self.team2.name if self.team2 else "TBD"
            return f"{self.tournament.title} - Round {self.round_number}, Match {self.match_number}: {team1_name} vs {team2_name}"
        else:
            p1_name = self.player1.full_name if self.player1 else "TBD"
            p2_name = self.player2.full_name if self.player2 else "TBD"
            return f"{self.tournament.title} - Round {self.round_number}, Match {self.match_number}: {p1_name} vs {p2_name}"

# Tournament-Level Referee Availability (before matches are created)
class TournamentRefereeAvailability(models.Model):
    """
    Allows organizers to book referee availability at tournament level,
    before matches are created. When bracket is generated, these convert
    to match-specific RefereeBooking records.
    """
    STATUS_CHOICES = (
        ('REQUESTED', 'Requested'),
        ('CONFIRMED', 'Confirmed'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
        ('CONVERTED', 'Converted to Match Bookings'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='referee_availability')
    referee = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='tournament_availability', limit_choices_to={'role':'REFEREE'})
    requested_by = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='referee_availability_requests', limit_choices_to={'role':'ORGANIZER'})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    fee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Agreed referee fee for the tournament")

    class Meta:
        unique_together = ('tournament', 'referee')
        indexes = [
            models.Index(fields=['tournament', 'status']),
            models.Index(fields=['referee', 'status']),
        ]
        verbose_name = 'Tournament Referee Availability'
        verbose_name_plural = 'Tournament Referee Availabilities'

    def __str__(self):
        return f"Referee {self.referee.full_name} for {self.tournament.title} ({self.status})"


# Player Match Statistics for League Tournaments
class PlayerMatchStats(models.Model):
    """
    Tracks individual player statistics (goals and assists) for league tournament matches.
    Used for calculating player leaderboards and individual performance metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='match_statistics',
        limit_choices_to={'role': 'PLAYER'}
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='player_statistics'
    )
    goals = models.IntegerField(default=0)
    assists = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('player', 'match')
        indexes = [
            models.Index(fields=['player', 'match']),
            models.Index(fields=['match']),
            models.Index(fields=['goals']),
            models.Index(fields=['assists']),
        ]
        verbose_name = 'Player Match Statistics'
        verbose_name_plural = 'Player Match Statistics'

    def __str__(self):
        return f"{self.player.full_name} - Match {self.match.id}: {self.goals}G {self.assists}A"
    
    def clean(self):
        """Validate model fields before saving"""
        from django.core.exceptions import ValidationError
        from teams.models import TeamMembership
        
        # Validate goals and assists are non-negative
        if self.goals < 0:
            raise ValidationError({
                'goals': 'Goals cannot be negative.'
            })
        
        if self.assists < 0:
            raise ValidationError({
                'assists': 'Assists cannot be negative.'
            })
        
        # Validate player belongs to one of the match teams
        if self.match and self.player:
            home_team = self.match.team1
            away_team = self.match.team2
            
            if home_team and away_team:
                is_home_player = TeamMembership.objects.filter(
                    team=home_team,
                    player=self.player,
                    is_active=True
                ).exists()
                
                is_away_player = TeamMembership.objects.filter(
                    team=away_team,
                    player=self.player,
                    is_active=True
                ).exists()
                
                if not is_home_player and not is_away_player:
                    raise ValidationError({
                        'player': f'Player {self.player.full_name} is not a member of either team in this match.'
                    })
        
        super().clean()


# Tournament Audit Log
class TournamentAuditLog(models.Model):
    """
    Tracks all administrative actions on tournaments for accountability.
    Retention period: 12 months minimum.
    """
    
    ACTION_CHOICES = (
        ('APPROVE', 'Approve Tournament'),
        ('REJECT', 'Reject Tournament'),
        ('CONDITIONAL_APPROVE', 'Conditional Approval'),
        ('BULK_APPROVE', 'Bulk Approve Tournaments'),
        ('BULK_REJECT', 'Bulk Reject Tournaments'),
        ('VIEW_DOCUMENT', 'View Verification Document'),
        ('REQUEST_DOCUMENTS', 'Request Additional Documents'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    administrator = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.PROTECT,
        related_name='tournament_admin_actions',
        limit_choices_to={'role': 'ADMIN'}
    )
    
    action_type = models.CharField(
        max_length=25,
        choices=ACTION_CHOICES,
        db_index=True
    )
    
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    
    tournament_ids = models.JSONField(
        default=list,
        blank=True,
        help_text='For bulk operations, list of affected tournament IDs'
    )
    
    previous_status = models.CharField(
        max_length=25,
        blank=True,
        help_text='Status before this action'
    )
    
    new_status = models.CharField(
        max_length=25,
        blank=True,
        help_text='Status after this action'
    )
    
    reason = models.TextField(
        blank=True,
        help_text='Reason provided for rejection or conditional approval'
    )
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context (IP address, user agent, validation results)'
    )
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['administrator', 'timestamp']),
            models.Index(fields=['action_type', 'timestamp']),
            models.Index(fields=['tournament', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.administrator.full_name} - {self.action_type} - {self.timestamp}"


# Match Remarks System
class MatchRemark(models.Model):
    """
    Organizer-created remarks for a match: penalties, cards, and custom notes.
    Used as reference when entering match scores.
    """
    REMARK_TYPES = (
        ('PENALTY', 'Penalty'),
        ('YELLOW_CARD', 'Yellow Card'),
        ('RED_CARD', 'Red Card'),
        ('FOUL', 'Foul'),
        ('INJURY', 'Injury'),
        ('SUBSTITUTION', 'Substitution'),
        ('DISPUTE', 'Dispute'),
        ('CUSTOM', 'Custom Note'),
    )

    SEVERITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='remarks'
    )
    created_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='match_remarks',
        limit_choices_to={'role': 'ORGANIZER'}
    )

    remark_type = models.CharField(max_length=20, choices=REMARK_TYPES, default='CUSTOM')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='LOW')

    # Optional player/team references
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='match_remarks'
    )
    player_name = models.CharField(max_length=200, blank=True, help_text="Player name (free text for flexibility)")
    minute = models.IntegerField(null=True, blank=True, help_text="Match minute when this occurred")

    # The actual remark
    title = models.CharField(max_length=200, blank=True, help_text="Short summary")
    description = models.TextField(blank=True, help_text="Detailed description")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['minute', 'created_at']
        indexes = [
            models.Index(fields=['match', 'remark_type']),
            models.Index(fields=['match', 'created_at']),
        ]

    def __str__(self):
        minute_str = f" ({self.minute}')" if self.minute is not None else ""
        return f"{self.get_remark_type_display()}{minute_str} - {self.match}"
