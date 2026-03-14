from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, time, timedelta

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
    latitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text='Latitude coordinate of the venue location')
    longitude = models.DecimalField(max_digits=20, decimal_places=15, null=True, blank=True, help_text='Longitude coordinate of the venue location')
    sport_types = models.JSONField(default=list, help_text='List of supported sport types (e.g., ["FUTSAL", "BADMINTON"])')
    court_size = models.CharField(max_length=50, default='Standard')  # e.g., "Standard", "5-a-side", etc.
    facilities = models.TextField(blank=True)  # Description of facilities
    capacity = models.IntegerField()
    price_per_hour = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='venue_images/', blank=True, null=True)  # For now, single image
    
    # Enhanced availability settings
    is_active = models.BooleanField(default=True)
    default_opening_time = models.TimeField(default=time(6, 0))  # 6:00 AM
    default_closing_time = models.TimeField(default=time(22, 0))  # 10:00 PM
    
    # Operating days (JSON field to store which days venue is open)
    # 1=Monday, 2=Tuesday, ..., 7=Sunday
    operating_days = models.JSONField(default=list)  # e.g., [1, 2, 3, 4, 5, 6, 7] for all days
    
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
        help_text='Current approval status of the venue'
    )
    
    approval_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when the venue was approved or rejected'
    )
    
    approved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_venues',
        help_text='Administrator who approved or rejected this venue'
    )
    
    rejection_reason = models.TextField(
        blank=True,
        help_text='Explanation provided when venue is rejected'
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
    
    # Timestamp fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    requested_documents = models.JSONField(
        default=list,
        blank=True,
        help_text='List of documents requested for conditional approval'
    )

    class Meta:
        indexes = [
            models.Index(fields=['approval_status', 'id']),
            models.Index(fields=['owner', 'approval_status']),
        ]

    def __str__(self):
        return f"{self.name} - {self.location}"

    def is_operating_day(self, date):
        """Check if venue operates on the given date's weekday"""
        weekday = date.weekday() + 1  # Convert to 1-7 (Monday=1)
        return weekday in self.operating_days

    def get_operating_hours(self, date):
        """Get operating hours for a specific date"""
        if not self.is_operating_day(date) or not self.is_active:
            return None
        
        # Check for date-specific availability override
        venue_availability = VenueAvailability.objects.filter(
            venue=self,
            date=date
        ).first()
        
        if venue_availability:
            if not venue_availability.is_available:
                return None  # Venue is closed on this date
            return {
                'opening_time': venue_availability.opening_time,
                'closing_time': venue_availability.closing_time,
                'notes': venue_availability.notes
            }
        
        # Return default operating hours
        return {
            'opening_time': self.default_opening_time,
            'closing_time': self.default_closing_time,
            'notes': None
        }

    def is_available_at_time(self, date, start_time, end_time):
        """Check if venue is available for booking at specific time"""
        operating_hours = self.get_operating_hours(date)
        if not operating_hours:
            return False
        
        # Check if requested time is within operating hours
        if start_time < operating_hours['opening_time'] or end_time > operating_hours['closing_time']:
            return False
        
        # Check for conflicting bookings
        conflicting_bookings = VenueBooking.objects.filter(
            venue=self,
            date=date,
            start_time__lt=end_time,
            end_time__gt=start_time,
            status__in=['CONFIRMED', 'PENDING']
        )
        
        return not conflicting_bookings.exists()


# Enhanced Venue Availability (for specific dates - overrides default hours)
class VenueAvailability(models.Model):
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    is_available = models.BooleanField(default=True)  # False to mark entire day as unavailable
    notes = models.TextField(blank=True)  # Reason for unavailability or special notes

    class Meta:
        ordering = ['date']
        unique_together = ('venue', 'date')

    def clean(self):
        if self.is_available and self.opening_time >= self.closing_time:
            raise ValidationError("Opening time must be before closing time")

    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.venue.name} - {self.date} ({status})"


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

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
        
        # Check if venue is available for this date/time
        if self.venue and self.date and self.start_time and self.end_time:
            # Check if venue is operating on this day
            weekday = self.date.weekday() + 1  # Convert to 1-7 (Monday=1)
            if self.venue.operating_days and weekday not in self.venue.operating_days:
                raise ValidationError(f"Venue is not operating on this day of the week")
            
            # Check for venue availability overrides
            venue_availability = VenueAvailability.objects.filter(
                venue=self.venue,
                date=self.date
            ).first()
            
            if venue_availability:
                if not venue_availability.is_available:
                    raise ValidationError(f"Venue is marked as unavailable on this date")
                
                # Check if time is within availability hours
                if (self.start_time < venue_availability.opening_time or 
                    self.end_time > venue_availability.closing_time):
                    raise ValidationError(
                        f"Booking time must be within venue hours: "
                        f"{venue_availability.opening_time} - {venue_availability.closing_time}"
                    )
            else:
                # Use default operating hours
                if (self.start_time < self.venue.default_opening_time or 
                    self.end_time > self.venue.default_closing_time):
                    raise ValidationError(
                        f"Booking time must be within venue hours: "
                        f"{self.venue.default_opening_time} - {self.venue.default_closing_time}"
                    )
            
            # Check for overlapping bookings
            conflicting_bookings = VenueBooking.objects.filter(
                venue=self.venue,
                date=self.date,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
                status__in=['CONFIRMED', 'PENDING']
            ).exclude(pk=self.pk)
            
            if conflicting_bookings.exists():
                raise ValidationError("This time slot conflicts with an existing booking")

    def save(self, *args, **kwargs):
        # Calculate amount based on duration and price_per_hour
        if self.start_time and self.end_time and self.venue.price_per_hour:
            from datetime import datetime, date, time
            from decimal import Decimal, ROUND_HALF_UP
            
            # Ensure start_time and end_time are time objects
            if isinstance(self.start_time, str):
                self.start_time = datetime.strptime(self.start_time, '%H:%M').time()
            if isinstance(self.end_time, str):
                self.end_time = datetime.strptime(self.end_time, '%H:%M').time()
            
            start = datetime.combine(date.today(), self.start_time)
            end = datetime.combine(date.today(), self.end_time)
            duration_hours = (end - start).total_seconds() / 3600
            calculated_amount = self.venue.price_per_hour * Decimal(str(duration_hours))
            # Round to 2 decimal places to match the field constraint
            self.amount = calculated_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        self.full_clean()  # Run validation
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.full_name} - {self.venue.name} ({self.date})"


# VenueAuditLog
import uuid

class VenueAuditLog(models.Model):
    """
    Tracks all administrative actions on venues for accountability.
    Retention period: 12 months minimum.
    """
    
    ACTION_CHOICES = (
        ('APPROVE', 'Approve Venue'),
        ('REJECT', 'Reject Venue'),
        ('CONDITIONAL_APPROVE', 'Conditional Approval'),
        ('BULK_APPROVE', 'Bulk Approve Venues'),
        ('BULK_REJECT', 'Bulk Reject Venues'),
        ('VIEW_DOCUMENT', 'View Verification Document'),
        ('REQUEST_DOCUMENTS', 'Request Additional Documents'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    administrator = models.ForeignKey(
        CustomUser,
        on_delete=models.PROTECT,
        related_name='venue_admin_actions',
        limit_choices_to={'role': 'ADMIN'}
    )
    
    action_type = models.CharField(
        max_length=25,
        choices=ACTION_CHOICES,
        db_index=True
    )
    
    venue = models.ForeignKey(
        Venue,
        on_delete=models.PROTECT,
        related_name='audit_logs',
        null=True,
        blank=True
    )
    
    venue_ids = models.JSONField(
        default=list,
        blank=True,
        help_text='For bulk operations, list of affected venue IDs'
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
            models.Index(fields=['venue', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.administrator.full_name} - {self.action_type} - {self.timestamp}"
