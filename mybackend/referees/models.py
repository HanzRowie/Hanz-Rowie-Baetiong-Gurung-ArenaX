from django.db import models
import uuid

# Import CustomUser from core
from accounts.models import CustomUser

class RefereeProfile(models.Model):
    """Extended profile for referees"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='referee_profile')
    certification_level = models.CharField(max_length=50, choices=(
        ('LEVEL_1', 'Level 1 - Beginner'),
        ('LEVEL_2', 'Level 2 - Intermediate'),
        ('LEVEL_3', 'Level 3 - Advanced'),
        ('LEVEL_4', 'Level 4 - Professional'),
        ('INTERNATIONAL', 'International'),
    ), default='LEVEL_1')
    sports_specialization = models.JSONField(default=list, blank=True)  # List of sports
    years_experience = models.IntegerField(default=0)
    license_number = models.CharField(max_length=100, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    rating = models.FloatField(default=0.0)  # Average rating from organizers
    total_matches_officiated = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.certification_level}"

class RefereeAvailability(models.Model):
    """Referee availability schedule"""
    referee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='referee_availabilities', limit_choices_to={'role':'REFEREE'})
    available_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)  # If null, available all day
    end_time = models.TimeField(null=True, blank=True)    # If null, available all day
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('referee', 'available_date')  # One slot per referee per date
        ordering = ['available_date', 'start_time']

    def __str__(self):
        time_str = f" {self.start_time}-{self.end_time}" if self.start_time and self.end_time else " (All Day)"
        return f"{self.referee.full_name} - {self.available_date}{time_str}"

    def covers_time_range(self, start_time, end_time):
        """Check if this availability slot covers the given time range"""
        if not self.is_available:
            return False
        
        # If no specific times set, available all day
        if not self.start_time or not self.end_time:
            return True
            
        # Check if the availability window covers the requested time
        return self.start_time <= start_time and self.end_time >= end_time

class RefereeBooking(models.Model):
    """Referee booking requests"""
    STATUS_CHOICES = (
        ('REQUESTED', 'Requested'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    referee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='referee_bookings_referees', limit_choices_to={'role':'REFEREE'})
    match = models.ForeignKey('tournaments.Match', on_delete=models.CASCADE, related_name='referee_bookings_referees')
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, related_name='referee_bookings_referees')
    requested_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='referee_requests_referees', limit_choices_to={'role':'ORGANIZER'})
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='REQUESTED')
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    match_date = models.DateTimeField()  # Denormalized for easier querying
    fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('referee', 'match')
        ordering = ['match_date']

    def __str__(self):
        return f"Referee {self.referee.full_name} for {self.tournament.title}"

class RefereeRating(models.Model):
    """Ratings given to referees by organizers"""
    referee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='referee_ratings', limit_choices_to={'role':'REFEREE'})
    organizer = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='given_ratings', limit_choices_to={'role':'ORGANIZER'})
    match = models.ForeignKey('tournaments.Match', on_delete=models.CASCADE, related_name='referee_ratings')
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, related_name='referee_ratings')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    comment = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('referee', 'organizer', 'match')

    def __str__(self):
        return f"Rating {self.rating} for {self.referee.full_name} by {self.organizer.full_name}"

class RefereeCertification(models.Model):
    """Referee certification records"""
    referee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='certifications', limit_choices_to={'role':'REFEREE'})
    certification_name = models.CharField(max_length=200)
    issuing_body = models.CharField(max_length=200)
    certification_number = models.CharField(max_length=100, unique=True)
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    certificate_file = models.FileField(upload_to='certificates/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.certification_name} - {self.referee.full_name}"

class RefereeMatchReport(models.Model):
    """Match reports submitted by referees"""
    referee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='match_reports', limit_choices_to={'role':'REFEREE'})
    match = models.OneToOneField('tournaments.Match', on_delete=models.CASCADE, related_name='referee_report')
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.CASCADE, related_name='match_reports')

    # Match details
    match_duration = models.DurationField(null=True, blank=True)
    weather_conditions = models.CharField(max_length=100, blank=True)
    court_conditions = models.CharField(max_length=100, blank=True)

    # Incident reporting
    incidents = models.TextField(blank=True)
    penalties_issued = models.TextField(blank=True)
    notable_events = models.TextField(blank=True)

    # Final report
    overall_assessment = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report for {self.match} by {self.referee.full_name}"
