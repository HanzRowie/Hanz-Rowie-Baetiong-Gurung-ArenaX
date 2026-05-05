from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid


class Team(models.Model):
    """
    Core team model representing a group of players organized for tournaments.
    Supports multiple sports and has a maximum size limit of 50 players.
    """
    SPORT_CHOICES = (
        ('FUTSAL', 'Futsal'),
        ('BADMINTON', 'Badminton'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    sport_types = models.JSONField(default=list)  # List of sports this team supports
    owner = models.ForeignKey(
        'accounts.CustomUser', 
        on_delete=models.CASCADE, 
        related_name='owned_teams',
        limit_choices_to={'role': 'PLAYER'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    max_size = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        # Ensure team names are unique within the same sport category
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(is_active=True),
                name='unique_active_team_name'
            )
        ]
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['owner']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        sports = ', '.join(self.sport_types) if self.sport_types else 'No sports'
        return f"{self.name} ({sports})"

    @property
    def member_count(self):
        """Get current number of active team members"""
        return self.memberships.filter(is_active=True).count()

    @property
    def is_full(self):
        """Check if team has reached maximum capacity"""
        return self.member_count >= self.max_size

    def can_add_member(self):
        """Check if team can accept new members"""
        return self.is_active and not self.is_full


class TeamMembership(models.Model):
    """
    Represents a player's membership in a team with role-based permissions.
    Supports Owner, Leader, and Member roles with different privileges.
    """
    ROLE_CHOICES = (
        ('OWNER', 'Owner'),
        ('LEADER', 'Leader'),
        ('CAPTAIN', 'Captain'),
        ('MEMBER', 'Member'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    player = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='team_memberships',
        limit_choices_to={'role': 'PLAYER'}
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('team', 'player')
        indexes = [
            models.Index(fields=['team', 'role']),
            models.Index(fields=['player', 'is_active']),
        ]

    def __str__(self):
        return f"{self.player.full_name} - {self.team.name} ({self.role})"

    def can_register_for_tournaments(self):
        """Check if this member can register the team for tournaments"""
        return self.role in ['OWNER', 'LEADER', 'CAPTAIN'] and self.is_active

    def can_assign_roles(self):
        """Check if this member can assign roles to other members"""
        return self.role in ['OWNER', 'CAPTAIN'] and self.is_active


class Invitation(models.Model):
    """
    Manages team invitations with automatic expiration and status tracking.
    Invitations expire after 7 days if not responded to.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('EXPIRED', 'Expired'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='invitations')
    player = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='team_invitations',
        limit_choices_to={'role': 'PLAYER'}
    )
    sender = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_team_invitations',
        limit_choices_to={'role': 'PLAYER'}
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    sent_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        unique_together = ('team', 'player')
        indexes = [
            models.Index(fields=['player', 'status']),
            models.Index(fields=['team', 'status']),
            models.Index(fields=['expires_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Set expiration to 7 days from creation
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invitation to {self.player.full_name} for {self.team.name} ({self.status})"

    def is_expired(self):
        """Check if invitation has expired"""
        return timezone.now() > self.expires_at

    def can_respond(self):
        """Check if invitation can still be responded to"""
        return self.status == 'PENDING' and not self.is_expired()

    def expire_if_needed(self):
        """Mark invitation as expired if past expiration date"""
        if self.status == 'PENDING' and self.is_expired():
            self.status = 'EXPIRED'
            self.save()
            return True
        return False


class TeamJoinRequest(models.Model):
    """
    Manages player requests to join teams.
    Players can request to join teams that are looking for members.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='join_requests')
    player = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='team_join_requests',
        limit_choices_to={'role': 'PLAYER'}
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True, help_text="Optional message from player")
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_join_responses',
        limit_choices_to={'role': 'PLAYER'}
    )

    class Meta:
        unique_together = ('team', 'player')
        indexes = [
            models.Index(fields=['player', 'status']),
            models.Index(fields=['team', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.player.full_name} request to join {self.team.name} ({self.status})"

    def can_respond(self):
        """Check if request can still be responded to"""
        return self.status == 'PENDING'


class ActivityHistory(models.Model):
    """
    Tracks all team-related events and changes over time.
    Maintains a chronological record of team evolution.
    """
    EVENT_TYPE_CHOICES = (
        ('TEAM_CREATED', 'Team Created'),
        ('MEMBER_ADDED', 'Member Added'),
        ('MEMBER_REMOVED', 'Member Removed'),
        ('ROLE_CHANGED', 'Role Changed'),
        ('TOURNAMENT_REGISTERED', 'Tournament Registered'),
        ('MATCH_PLAYED', 'Match Played'),
        ('OWNERSHIP_TRANSFERRED', 'Ownership Transferred'),
        ('INVITATION_SENT', 'Invitation Sent'),
        ('INVITATION_ACCEPTED', 'Invitation Accepted'),
        ('INVITATION_DECLINED', 'Invitation Declined'),
        ('JOIN_REQUEST_SENT', 'Join Request Sent'),
        ('JOIN_REQUEST_ACCEPTED', 'Join Request Accepted'),
        ('JOIN_REQUEST_DECLINED', 'Join Request Declined'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='activity_history')
    event_type = models.CharField(max_length=25, choices=EVENT_TYPE_CHOICES)
    description = models.TextField()
    performed_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_activities'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)  # Additional event-specific data

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['team', '-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
        ]

    def __str__(self):
        performer = f" by {self.performed_by.full_name}" if self.performed_by else ""
        return f"{self.team.name}: {self.event_type}{performer} at {self.timestamp}"


# Tournament-related models for team registration
class TeamTournamentRegistration(models.Model):
    """
    Extends tournament registration to support team-based registration.
    Maintains backward compatibility with individual registrations.
    """
    STATUS_CHOICES = (
        ('PENDING_PAYMENT', 'Pending Payment'),
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        'tournaments.Tournament',
        on_delete=models.CASCADE,
        related_name='team_registrations'
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='tournament_registrations')
    selected_players = models.ManyToManyField(
        'accounts.CustomUser',
        related_name='selected_for_tournaments',
        limit_choices_to={'role': 'PLAYER'}
    )
    registered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='team_tournament_registrations',
        limit_choices_to={'role': 'PLAYER'}
    )
    registered_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Payment integration
    payment = models.ForeignKey(
        'payments.Payment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_tournament_registrations'
    )
    payment_verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('tournament', 'team')
        indexes = [
            models.Index(fields=['tournament', 'status']),
            models.Index(fields=['team', 'status']),
        ]

    def __str__(self):
        return f"{self.team.name} - {self.tournament.title} ({self.status})"

    @property
    def selected_player_count(self):
        """Get number of selected players for this registration"""
        return self.selected_players.count()


# Sport-specific scoring models
class FutsalScore(models.Model):
    """
    Futsal-specific match scoring with player statistics.
    Tracks goals and assists for each player in the team.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        'tournaments.Match',
        on_delete=models.CASCADE,
        related_name='futsal_scores'
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='futsal_scores')
    goals = models.IntegerField(default=0)
    
    # Enhanced team-level statistics
    shots_on_target = models.IntegerField(default=0, blank=True)
    shots_off_target = models.IntegerField(default=0, blank=True)
    possession_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fouls = models.IntegerField(default=0, blank=True)
    yellow_cards = models.IntegerField(default=0, blank=True)
    red_cards = models.IntegerField(default=0, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('match', 'team')

    def __str__(self):
        return f"{self.team.name} - {self.goals} goals in match {self.match.id}"

    def validate_player_stats_consistency(self):
        """
        Validate that the sum of individual player goals equals team goals.
        Returns True if consistent, False otherwise.
        """
        total_player_goals = sum(stat.goals for stat in self.player_stats.all())
        return total_player_goals == self.goals

    def get_total_assists(self):
        """Get total assists for this team in the match."""
        return sum(stat.assists for stat in self.player_stats.all())

    def get_total_minutes_played(self):
        """Get total minutes played by all players (can exceed match duration due to substitutions)."""
        return sum(stat.minutes_played for stat in self.player_stats.all())

    @property
    def total_shots(self):
        """Get total shots (on target + off target)"""
        return self.shots_on_target + self.shots_off_target

    @property
    def shot_accuracy(self):
        """Calculate shot accuracy percentage"""
        if self.total_shots == 0:
            return 0
        return round((self.shots_on_target / self.total_shots) * 100, 1)


class FutsalPlayerStat(models.Model):
    """
    Individual player statistics for futsal matches.
    Tracks goals, assists, and minutes played for each player.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    futsal_score = models.ForeignKey(FutsalScore, on_delete=models.CASCADE, related_name='player_stats')
    player = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='futsal_stats',
        limit_choices_to={'role': 'PLAYER'}
    )
    
    # Basic statistics
    goals = models.IntegerField(default=0)
    assists = models.IntegerField(default=0)
    minutes_played = models.IntegerField(default=0)
    is_starter = models.BooleanField(default=True, help_text="Whether player started the match")
    
    # Enhanced offensive statistics
    shots_on_target = models.IntegerField(default=0, blank=True)
    shots_off_target = models.IntegerField(default=0, blank=True)
    
    # Defensive statistics
    tackles = models.IntegerField(default=0, blank=True)
    interceptions = models.IntegerField(default=0, blank=True)
    clearances = models.IntegerField(default=0, blank=True)
    
    # Disciplinary
    yellow_cards = models.IntegerField(default=0, blank=True)
    red_cards = models.IntegerField(default=0, blank=True)
    fouls_committed = models.IntegerField(default=0, blank=True)
    fouls_suffered = models.IntegerField(default=0, blank=True)
    
    # Passing statistics
    passes_completed = models.IntegerField(default=0, blank=True)
    passes_attempted = models.IntegerField(default=0, blank=True)

    class Meta:
        unique_together = ('futsal_score', 'player')

    def __str__(self):
        return f"{self.player.full_name} - {self.goals}G {self.assists}A ({self.minutes_played}min)"

    def get_performance_score(self):
        """
        Calculate a simple performance score based on goals and assists.
        Goals are weighted more heavily than assists.
        """
        return (self.goals * 2) + self.assists

    @property
    def total_shots(self):
        """Get total shots (on target + off target)"""
        return self.shots_on_target + self.shots_off_target

    @property
    def shot_accuracy(self):
        """Calculate shot accuracy percentage"""
        if self.total_shots == 0:
            return 0
        return round((self.shots_on_target / self.total_shots) * 100, 1)

    @property
    def pass_accuracy(self):
        """Calculate pass accuracy percentage"""
        if self.passes_attempted == 0:
            return 0
        return round((self.passes_completed / self.passes_attempted) * 100, 1)

    @property
    def goals_per_minute(self):
        """Calculate goals per minute played"""
        if self.minutes_played == 0:
            return 0
        return round(self.goals / self.minutes_played, 3)

    @property
    def assists_per_minute(self):
        """Calculate assists per minute played"""
        if self.minutes_played == 0:
            return 0
        return round(self.assists / self.minutes_played, 3)


class BadmintonSet(models.Model):
    """
    Badminton set scoring following BWF guidelines.
    Implements 21-point system with 2-point lead requirement and 30-point cap.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        'tournaments.Match',
        on_delete=models.CASCADE,
        related_name='badminton_sets'
    )
    set_number = models.IntegerField()
    home_score = models.IntegerField()
    away_score = models.IntegerField()
    duration = models.IntegerField(help_text="Duration in minutes")

    class Meta:
        unique_together = ('match', 'set_number')
        ordering = ['set_number']

    def __str__(self):
        return f"Set {self.set_number}: {self.home_score}-{self.away_score}"

    def is_valid_score(self):
        """
        Validate badminton scoring rules according to BWF guidelines:
        - 21-point system
        - Must win by 2 points
        - First to 30 points wins at 29-all
        - Scores cannot be negative
        """
        if self.home_score < 0 or self.away_score < 0:
            return False

        if self.home_score > 30 or self.away_score > 30:
            return False

        max_score = max(self.home_score, self.away_score)
        min_score = min(self.home_score, self.away_score)

        if max_score >= 21 and (max_score - min_score) >= 2:
            return True

        if max_score == 30 and min_score >= 29:
            return True

        return False

    def get_winner(self):
        """Returns 'home', 'away', or None if set is not complete."""
        if not self.is_valid_score():
            return None
        if self.home_score > self.away_score:
            return 'home'
        elif self.away_score > self.home_score:
            return 'away'
        return None

    @classmethod
    def validate_match_sets(cls, sets):
        """Validate a complete badminton match (best of 3 sets)."""
        if not sets or len(sets) < 2 or len(sets) > 3:
            return False

        home_sets_won = 0
        away_sets_won = 0

        for set_obj in sets:
            if not set_obj.is_valid_score():
                return False
            winner = set_obj.get_winner()
            if winner == 'home':
                home_sets_won += 1
            elif winner == 'away':
                away_sets_won += 1
            else:
                return False

        if len(sets) == 2:
            return (home_sets_won == 2 and away_sets_won == 0) or \
                   (home_sets_won == 0 and away_sets_won == 2)
        elif len(sets) == 3:
            return (home_sets_won == 2 and away_sets_won == 1) or \
                   (home_sets_won == 1 and away_sets_won == 2)

        return False


class FutsalGoal(models.Model):
    """Individual goal records with scorer and assist details"""
    GOAL_TYPES = (
        ('REGULAR', 'Regular Goal'),
        ('PENALTY', 'Penalty'),
        ('FREE_KICK', 'Free Kick'),
        ('OWN_GOAL', 'Own Goal'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    futsal_score = models.ForeignKey(FutsalScore, on_delete=models.CASCADE, related_name='goal_details')
    scorer = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='futsal_goals_scored')
    assist_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='futsal_assists')
    
    minute = models.IntegerField(help_text="Minute when goal was scored")
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES, default='REGULAR')
    description = models.TextField(blank=True, help_text="Optional description of the goal")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['minute']

    def __str__(self):
        assist_text = f" (assist: {self.assist_by.full_name})" if self.assist_by else ""
        return f"{self.scorer.full_name} - {self.minute}'{assist_text}"


class FutsalCard(models.Model):
    """Yellow and red cards issued during the match"""
    CARD_TYPES = (
        ('YELLOW', 'Yellow Card'),
        ('RED', 'Red Card'),
    )
    
    CARD_REASONS = (
        ('UNSPORTING_BEHAVIOR', 'Unsporting Behavior'),
        ('DISSENT', 'Dissent by Word or Action'),
        ('PERSISTENT_FOULING', 'Persistent Fouling'),
        ('DELAYING_GAME', 'Delaying the Restart of Play'),
        ('FAILING_DISTANCE', 'Failing to Respect Required Distance'),
        ('ENTERING_LEAVING', 'Entering or Leaving Field Without Permission'),
        ('SERIOUS_FOUL', 'Serious Foul Play'),
        ('VIOLENT_CONDUCT', 'Violent Conduct'),
        ('OFFENSIVE_LANGUAGE', 'Offensive Language/Gestures'),
        ('SECOND_YELLOW', 'Second Yellow Card'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    futsal_score = models.ForeignKey(FutsalScore, on_delete=models.CASCADE, related_name='cards')
    player = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='futsal_cards_received')
    
    card_type = models.CharField(max_length=10, choices=CARD_TYPES)
    reason = models.CharField(max_length=30, choices=CARD_REASONS)
    minute = models.IntegerField(help_text="Minute when card was issued")
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['minute']

    def __str__(self):
        return f"{self.player.full_name} - {self.card_type} card ({self.minute}')"