from django.db import models

# Import CustomUser from core
from accounts.models import CustomUser

# Venue
class Venue(models.Model):
    SPORT_CHOICES = (
        ('FUTSAL', 'Futsal'),
        ('BADMINTON', 'Badminton'),
    )

    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'VENUE_OWNER'})
    name = models.CharField(max_length=100)
    location = models.TextField()
    sport_type = models.CharField(max_length=10, choices=SPORT_CHOICES, default='FUTSAL')
    court_size = models.CharField(max_length=50, default='Standard')  # e.g., "Standard", "5-a-side", etc.
    facilities = models.TextField(blank=True)  # Description of facilities
    capacity = models.IntegerField()
    price_per_hour = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='venue_images/', blank=True, null=True)  # For now, single image

    def __str__(self):
        return f"{self.name} - {self.location}"

# Venue Availability
class VenueAvailability(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)  # True for available, False for blocked/unavailable

    class Meta:
        ordering = ['date', 'start_time']
        unique_together = ('venue', 'date', 'start_time', 'end_time')  # Prevent overlapping slots

    def __str__(self):
        return f"{self.venue.name} - {self.date} {self.start_time}-{self.end_time} ({'Available' if self.is_available else 'Blocked'})"

# Venue Booking
class VenueBooking(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    )

    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='bookings')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    purpose = models.CharField(max_length=200, blank=True)  # Event type/purpose
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # Calculated amount
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['date', 'start_time']

    def save(self, *args, **kwargs):
        # Calculate amount based on duration and price_per_hour
        if self.start_time and self.end_time and self.venue.price_per_hour:
            from datetime import datetime, date, time
            from decimal import Decimal
            
            # Ensure start_time and end_time are time objects
            if isinstance(self.start_time, str):
                self.start_time = datetime.strptime(self.start_time, '%H:%M').time()
            if isinstance(self.end_time, str):
                self.end_time = datetime.strptime(self.end_time, '%H:%M').time()
            
            start = datetime.combine(date.today(), self.start_time)
            end = datetime.combine(date.today(), self.end_time)
            duration_hours = (end - start).total_seconds() / 3600
            self.amount = self.venue.price_per_hour * Decimal(str(duration_hours))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.full_name} - {self.venue.name} ({self.date})"
