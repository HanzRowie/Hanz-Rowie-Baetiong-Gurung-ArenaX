from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
import uuid
import random

# Import models from other apps
from tournaments.models import Tournament

# Custom User Model - MOVED FROM core
class CustomUser(AbstractUser):
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('PLAYER', 'Player'),
        ('ORGANIZER', 'Organizer'),
        ('REFEREE', 'Referee'),
        ('VENUE_OWNER', 'Venue Owner'),
    )

    SKILL_LEVELS = (
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
        ('PROFESSIONAL', 'Professional'),
    )

    GENDER_CHOICES = (
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PLAYER')
    is_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    # Additional profile fields
    bio = models.TextField(blank=True, max_length=500)
    date_of_birth = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    country = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    preferred_sports = models.JSONField(default=list, blank=True)  # List of sports
    skill_level = models.CharField(max_length=20, choices=SKILL_LEVELS, blank=True)
    achievements = models.TextField(blank=True)
    social_links = models.JSONField(default=dict, blank=True)  # Dict for social media links
    is_available_for_matches = models.BooleanField(default=True)

    # Statistics fields
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    win_rate = models.FloatField(default=0.0)
    wta_ranking = models.IntegerField(null=True, blank=True)  # For female tennis players
    atp_ranking = models.IntegerField(null=True, blank=True)  # For male tennis players

    # Wallet & Earnings (For Referees and Organizers)
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Venue Owner fields
    business_name = models.CharField(max_length=255, blank=True)
    business_registration = models.CharField(max_length=100, blank=True)
    business_contact = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Fix reverse accessor clash
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_permissions_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions'
    )

    def __str__(self):
        return f"{self.full_name} ({self.role})"


# Player Finder / Join Requests - MOVED FROM core
class PlayerJoinRequest(models.Model):
    from_player = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_requests', limit_choices_to={'role':'PLAYER'})
    to_player = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_requests', limit_choices_to={'role':'PLAYER'})
    status = models.CharField(max_length=10, choices=(('pending','Pending'),('accepted','Accepted'),('declined','Declined')), default='pending')
    created_at = models.DateTimeField(auto_now_add=True)


# Notifications - MOVED FROM core
class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('REGISTRATION_CONFIRMED', 'Registration Confirmed'),
        ('REGISTRATION_REJECTED', 'Registration Rejected'),
        ('TOURNAMENT_UPDATED', 'Tournament Updated'),
        ('MATCH_SCHEDULED', 'Match Scheduled'),
        ('BOOKING_CONFIRMED', 'Booking Confirmed'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('GENERAL', 'General Notification'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='GENERAL')
    title = models.CharField(max_length=200)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional references to related objects
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    related_id = models.UUIDField(null=True, blank=True)  # Can reference any UUID field

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.user.full_name} at {self.created_at}"


# Player Statistics for monthly tracking - MOVED FROM core
class PlayerStatistics(models.Model):
    player = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='monthly_stats', limit_choices_to={'role': 'PLAYER'})
    year = models.IntegerField()
    month = models.IntegerField()
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    tournaments_participated = models.IntegerField(default=0)
    tournaments_won = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('player', 'year', 'month')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.player.full_name} - {self.year}/{self.month:02d}"

    @property
    def win_rate(self):
        if self.matches_played == 0:
            return 0.0
        return (self.matches_won / self.matches_played) * 100


# Upcoming Match tracking - MOVED FROM core
class UpcomingMatch(models.Model):
    player = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='upcoming_matches', limit_choices_to={'role': 'PLAYER'})
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    match_date = models.DateTimeField()
    opponent_name = models.CharField(max_length=255)
    tournament_name = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['match_date']

    def __str__(self):
        return f"{self.player.full_name} vs {self.opponent_name} - {self.tournament_name}"


# Email Verification with OTP
class EmailVerification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='email_verifications_accounts')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)  # OTP valid for 10 minutes
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    @staticmethod
    def generate_otp():
        return str(random.randint(100000, 999999))

    def __str__(self):
        return f"OTP for {self.user.email} - {'Used' if self.is_used else 'Valid' if self.is_valid() else 'Expired'}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_tokens_accounts')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)  # Token valid for 1 hour
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    @staticmethod
    def generate_token():
        import uuid
        return uuid.uuid4().hex

    def __str__(self):
        return f"Password reset token for {self.user.email} - {'Used' if self.is_used else 'Valid' if self.is_valid() else 'Expired'}"


class BlacklistedToken(models.Model):
    """Model to store blacklisted refresh tokens"""
    token = models.CharField(max_length=500, unique=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='blacklisted_tokens')
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # When the original token would have expired

    class Meta:
        ordering = ['-blacklisted_at']

    def save(self, *args, **kwargs):
        # If expires_at not set, default to 7 days from now (same as token expiry)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_expired(self):
        """Check if the blacklist entry itself has expired"""
        return timezone.now() > self.expires_at

    @staticmethod
    def is_token_blacklisted(token):
        """Check if a token is blacklisted"""
        return BlacklistedToken.objects.filter(token=token).exists()

    def __str__(self):
        return f"Blacklisted token for {self.user.email} - blacklisted at {self.blacklisted_at}"
