from django.db import models
import uuid

# Import CustomUser from core
from accounts.models import CustomUser

class OrganizerProfile(models.Model):
    """Extended profile for organizers"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='organizer_profile')
    organization_name = models.CharField(max_length=200, blank=True)
    business_license = models.FileField(upload_to='licenses/', null=True, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    social_media_links = models.JSONField(default=dict, blank=True)
    years_experience = models.IntegerField(default=0)
    specializations = models.JSONField(default=list, blank=True)  # List of sports/types
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.organization_name or 'Individual'}"

class TournamentAnalytics(models.Model):
    """Analytics for tournaments organized by users"""
    organizer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='tournament_analytics')
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, related_name='analytics')
    total_registrations = models.IntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    views_count = models.IntegerField(default=0)
    completion_rate = models.FloatField(default=0.0)  # Percentage of registered players who completed
    average_rating = models.FloatField(default=0.0)
    feedback_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('organizer', 'tournament')

    def __str__(self):
        return f"{self.tournament.title} - {self.organizer.full_name}"

class OrganizerNotification(models.Model):
    """Special notifications for organizers"""
    NOTIFICATION_TYPES = (
        ('REGISTRATION_UPDATE', 'Registration Update'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('TOURNAMENT_REMINDER', 'Tournament Reminder'),
        ('VENUE_CONFIRMATION', 'Venue Confirmation'),
        ('REFEREE_REQUEST', 'Referee Request'),
        ('SYSTEM_ANNOUNCEMENT', 'System Announcement'),
    )

    organizer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='organizer_notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    read = models.BooleanField(default=False)
    action_url = models.URLField(blank=True)  # Link to take action
    priority = models.CharField(max_length=10, choices=(('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High')), default='MEDIUM')

    # Related objects
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, null=True, blank=True)
    venue_booking = models.ForeignKey('venues.VenueBooking', on_delete=models.CASCADE, null=True, blank=True)
    related_id = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.organizer.full_name}"

class OrganizerSubscription(models.Model):
    """Subscription plans for organizers"""
    SUBSCRIPTION_TYPES = (
        ('FREE', 'Free'),
        ('BASIC', 'Basic'),
        ('PREMIUM', 'Premium'),
        ('ENTERPRISE', 'Enterprise'),
    )

    organizer = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='subscription')
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_TYPES, default='FREE')
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    max_tournaments_per_month = models.IntegerField(default=5)
    max_participants_per_tournament = models.IntegerField(default=32)
    advanced_analytics = models.BooleanField(default=False)
    priority_support = models.BooleanField(default=False)
    custom_branding = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.organizer.full_name} - {self.subscription_type}"

class TournamentTemplate(models.Model):
    """Reusable tournament templates for organizers"""
    organizer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='tournament_templates')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    sport_type = models.CharField(max_length=50)
    tournament_type = models.CharField(max_length=20, choices=[
        ('SINGLE_ELIMINATION', 'Single Elimination'),
        ('DOUBLE_ELIMINATION', 'Double Elimination'),
        ('ROUND_ROBIN', 'Round Robin'),
        ('SWISS', 'Swiss System'),
    ])
    default_max_participants = models.IntegerField(default=16)
    default_entry_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    default_rules = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)  # Share with other organizers
    usage_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.organizer.full_name}"
