"""
Payment Service Layer
Centralized payment processing logic for all payment types
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from .models import Payment, PaymentMethod, Transaction, Refund
from .utils import KhaltiPaymentGateway


class PaymentService:
    """Base payment processing service"""
    
    def __init__(self):
        self.khalti = KhaltiPaymentGateway()
    
    @transaction.atomic
    def create_payment(self, user, payment_type, amount, currency='NPR', **kwargs):
        """Create a new payment record"""
        payment = Payment.objects.create(
            user=user,
            payment_type=payment_type,
            amount=amount,
            currency=currency,
            status='PENDING',
            description=kwargs.get('description', ''),
            venue_booking=kwargs.get('venue_booking'),
            referee_booking=kwargs.get('referee_booking'),
            tournament=kwargs.get('tournament'),
            payment_method=kwargs.get('payment_method'),
            metadata=kwargs.get('metadata', {})
        )
        return payment
    
    def initiate_khalti_payment(self, payment, customer_info):
        """Initiate payment with Khalti gateway"""
        from django.conf import settings
        
        # Check if mock mode is enabled
        if getattr(settings, 'PAYMENT_MOCK_MODE', False):
            import logging
            logger = logging.getLogger(__name__)
            logger.info("🎭 MOCK MODE: Simulating Khalti payment initiation")
            
            # Return mock response
            mock_pidx = f"MOCK_{payment.id}"
            mock_response = {
                'pidx': mock_pidx,
                'payment_url': f'{settings.KHALTI_CONFIG["WEBSITE_URL"]}/payment/mock?pidx={mock_pidx}',
                'expires_at': (timezone.now() + timezone.timedelta(minutes=30)).isoformat(),
                'expires_in': 1800,
                'mock_mode': True
            }
            
            payment.transaction_id = mock_pidx
            payment.payment_processor = 'KHALTI_MOCK'
            payment.status = 'PROCESSING'
            payment.metadata.update(mock_response)
            payment.save()
            
            # Create transaction record
            Transaction.objects.create(
                payment=payment,
                transaction_type='CHARGE',
                amount=payment.amount,
                currency=payment.currency,
                status='PENDING',
                external_transaction_id=mock_pidx,
                payment_processor='KHALTI_MOCK',
                processor_response=mock_response
            )
            
            logger.info(f"🎭 MOCK MODE: Payment {payment.id} initiated with mock PIDX: {mock_pidx}")
            return mock_response
        
        # Real Khalti integration
        payment_data = {
            'amount': int(payment.amount * 100),  # Convert to paisa
            'purchase_order_id': str(payment.id),
            'purchase_order_name': payment.description or f'{payment.payment_type} Payment',
            'customer_info': customer_info
        }
        
        response = self.khalti.initiate_payment(payment_data)
        
        if 'error' not in response:
            payment.transaction_id = response.get('pidx')
            payment.payment_processor = 'KHALTI'
            payment.status = 'PROCESSING'
            payment.metadata.update(response)
            payment.save()
            
            # Create transaction record
            Transaction.objects.create(
                payment=payment,
                transaction_type='CHARGE',
                amount=payment.amount,
                currency=payment.currency,
                status='PENDING',
                external_transaction_id=response.get('pidx'),
                payment_processor='KHALTI',
                processor_response=response
            )
        
        return response
    
    @transaction.atomic
    def verify_payment(self, payment):
        """Verify payment status with Khalti"""
        if not payment.transaction_id:
            return {'error': 'No transaction ID found'}
        
        verification = self.khalti.verify_payment(payment.transaction_id)
        
        if 'error' in verification:
            return verification
        
        # Update payment status based on verification
        if verification.get('status') == 'Completed':
            payment.status = 'COMPLETED'
            payment.processed_at = timezone.now()
            payment.save()
            
            # Update transaction
            txn = Transaction.objects.filter(
                payment=payment,
                external_transaction_id=payment.transaction_id
            ).first()
            
            if txn:
                txn.status = 'SUCCESS'
                txn.processed_at = timezone.now()
                txn.processor_response = verification
                txn.save()
        
        return verification
    
    @transaction.atomic
    def process_refund(self, payment, amount, reason):
        """Process a refund for a payment"""
        if payment.status != 'COMPLETED':
            raise ValueError('Can only refund completed payments')
        
        if amount > payment.amount:
            raise ValueError('Refund amount cannot exceed payment amount')
        
        # Create refund payment record
        refund_payment = Payment.objects.create(
            user=payment.user,
            payment_type=payment.payment_type,
            amount=amount,
            currency=payment.currency,
            status='PENDING',
            description=f'Refund for {payment.id}',
            payment_processor=payment.payment_processor
        )
        
        # Create refund record
        refund = Refund.objects.create(
            original_payment=payment,
            refund_payment=refund_payment,
            amount=amount,
            reason=reason,
            status='PENDING'
        )
        
        # In production, initiate actual refund with payment gateway
        # For now, mark as completed
        refund_payment.status = 'COMPLETED'
        refund_payment.processed_at = timezone.now()
        refund_payment.save()
        
        refund.status = 'COMPLETED'
        refund.processed_at = timezone.now()
        refund.save()
        
        # Update original payment status
        payment.status = 'REFUNDED'
        payment.save()
        
        return refund


class TournamentPaymentService(PaymentService):
    """Tournament-specific payment logic"""
    
    def process_registration_payment(self, tournament, user, registration):
        """Process payment for tournament registration"""
        payment = self.create_payment(
            user=user,
            payment_type='TOURNAMENT_FEE',
            amount=tournament.entry_fee,
            tournament=tournament,
            description=f'Entry fee for {tournament.title}'
        )
        
        # Link payment to registration
        registration.payment = payment
        registration.save()
        
        return payment
    
    def calculate_refund_amount(self, tournament, payment):
        """Calculate refund amount based on tournament date"""
        days_until = (tournament.date - timezone.now().date()).days
        
        if days_until >= 30:
            return payment.amount  # 100% refund
        elif days_until >= 14:
            return payment.amount * Decimal('0.75')  # 75% refund
        elif days_until >= 7:
            return payment.amount * Decimal('0.50')  # 50% refund
        else:
            return Decimal('0')  # No refund


class VenuePaymentService(PaymentService):
    """Venue booking payment logic"""
    
    def calculate_booking_cost(self, venue, start_time, end_time):
        """Calculate total cost for venue booking"""
        duration_hours = (end_time - start_time).total_seconds() / 3600
        return venue.price_per_hour * Decimal(str(duration_hours))
    
    def process_booking_payment(self, venue_booking):
        """Process payment for venue booking"""
        payment = self.create_payment(
            user=venue_booking.user,
            payment_type='VENUE_BOOKING',
            amount=venue_booking.amount,
            venue_booking=venue_booking,
            description=f'Venue booking for {venue_booking.venue.name}'
        )
        
        venue_booking.payment = payment
        venue_booking.save()
        
        return payment
    
    def calculate_cancellation_refund(self, venue_booking):
        """Calculate refund for cancelled booking"""
        hours_until = (venue_booking.start_time - timezone.now()).total_seconds() / 3600
        
        if hours_until >= 48:
            return venue_booking.amount  # 100% refund
        else:
            return Decimal('0')  # No refund


class RefereePaymentService(PaymentService):
    """Referee payment logic with escrow"""
    
    def process_referee_payment(self, referee_booking, organizer):
        """Process payment from organizer for referee"""
        payment = self.create_payment(
            user=organizer,
            payment_type='REFEREE_BOOKING',
            amount=referee_booking.fee,
            referee_booking=referee_booking,
            description=f'Referee fee for {referee_booking.tournament.title}'
        )
        
        referee_booking.payment = payment
        referee_booking.save()
        
        return payment
    
    @transaction.atomic
    def hold_in_escrow(self, payment):
        """Mark payment as held in escrow"""
        payment.status = 'COMPLETED'
        payment.processed_at = timezone.now()
        payment.metadata['escrow'] = True
        payment.metadata['escrow_held_at'] = timezone.now().isoformat()
        payment.save()
        
        # Update referee booking
        if payment.referee_booking:
            payment.referee_booking.payment_status = 'COMPLETED'
            payment.referee_booking.save()
    
    @transaction.atomic
    def release_to_referee(self, referee_booking):
        """Release escrowed payment to referee"""
        payment = referee_booking.payment
        
        if not payment or payment.status != 'COMPLETED':
            raise ValueError('Payment not in escrow')
        
        if not payment.metadata.get('escrow'):
            raise ValueError('Payment not held in escrow')
        
        # Mark as released
        payment.metadata['escrow_released'] = True
        payment.metadata['escrow_released_at'] = timezone.now().isoformat()
        payment.save()
        
        # Update booking
        referee_booking.payment_released = True
        referee_booking.payment_released_at = timezone.now()
        referee_booking.save()
        
        return True
    
    def calculate_referee_earnings(self, referee, start_date=None, end_date=None):
        """Calculate referee earnings for a period"""
        from referees.models import RefereeBooking
        
        bookings = RefereeBooking.objects.filter(
            referee=referee,
            payment_released=True
        )
        
        if start_date:
            bookings = bookings.filter(payment_released_at__gte=start_date)
        if end_date:
            bookings = bookings.filter(payment_released_at__lte=end_date)
        
        total = sum(booking.fee for booking in bookings)
        count = bookings.count()
        
        return {
            'total_earnings': total,
            'completed_matches': count,
            'average_fee': total / count if count > 0 else 0
        }
