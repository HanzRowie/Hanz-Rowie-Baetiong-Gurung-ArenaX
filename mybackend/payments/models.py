from django.db import models
import uuid

# Import CustomUser from accounts
from accounts.models import CustomUser

class PaymentMethod(models.Model):
    """Payment methods for users"""
    METHOD_TYPES = (
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('DIGITAL_WALLET', 'Digital Wallet'),
        ('CASH', 'Cash'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='payment_methods')
    method_type = models.CharField(max_length=15, choices=METHOD_TYPES)
    provider = models.CharField(max_length=50, blank=True)  # e.g., Visa, Mastercard, PayPal, etc.
    last_four = models.CharField(max_length=4, blank=True)  # Last 4 digits of card
    expiry_date = models.DateField(null=True, blank=True)  # For cards
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Tokenized payment info (would be encrypted in production)
    payment_token = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.method_type} ({self.last_four})"

class Payment(models.Model):
    """Main payment record"""
    PAYMENT_TYPES = (
        ('VENUE_BOOKING', 'Venue Booking'),
        ('REFEREE_BOOKING', 'Referee Booking'),
        ('TOURNAMENT_FEE', 'Tournament Fee'),
        ('SUBSCRIPTION', 'Subscription'),
        ('OTHER', 'Other'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('REFUNDED', 'Refunded'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='payments')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True)

    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    description = models.TextField(blank=True)

    # Related objects (nullable foreign keys to different models)
    venue_booking = models.ForeignKey('venues.VenueBooking', on_delete=models.SET_NULL, null=True, blank=True)
    referee_booking = models.ForeignKey('referees.RefereeBooking', on_delete=models.SET_NULL, null=True, blank=True)
    tournament = models.ForeignKey('tournaments.Tournament', on_delete=models.SET_NULL, null=True, blank=True)

    # Payment processor details
    transaction_id = models.CharField(max_length=255, blank=True)  # External transaction ID
    payment_processor = models.CharField(max_length=50, blank=True)  # Stripe, PayPal, etc.
    processor_fee = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)  # Additional payment data

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.payment_type} - ${self.amount} ({self.status})"

class Transaction(models.Model):
    """Detailed transaction records from payment processors"""
    TRANSACTION_TYPES = (
        ('CHARGE', 'Charge'),
        ('REFUND', 'Refund'),
        ('TRANSFER', 'Transfer'),
        ('FEE', 'Fee'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    external_transaction_id = models.CharField(max_length=255, blank=True)
    payment_processor = models.CharField(max_length=50, blank=True)

    # Response data from payment processor
    processor_response = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.payment.id} - {self.transaction_type} - ${self.amount}"

class Refund(models.Model):
    """Refund records"""
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    original_payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    refund_payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='original_refund')

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')

    # Refund processor details
    refund_transaction_id = models.CharField(max_length=255, blank=True)
    processor_response = models.JSONField(default=dict, blank=True)

    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"Refund for {self.original_payment.id} - ${self.amount}"
