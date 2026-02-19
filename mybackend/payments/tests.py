from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

from .models import Payment, PaymentMethod, Transaction, Refund
from .services import (
    PaymentService,
    TournamentPaymentService,
    VenuePaymentService,
    RefereePaymentService
)
from tournaments.models import Tournament
from venues.models import Venue, VenueBooking
from referees.models import RefereeBooking
from accounts.models import CustomUser

User = get_user_model()


class PaymentModelTests(TestCase):
    """Test Payment models"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            full_name='Test User',
            role='PLAYER'
        )
    
    def test_create_payment_method(self):
        """Test creating a payment method"""
        pm = PaymentMethod.objects.create(
            user=self.user,
            method_type='CREDIT_CARD',
            provider='Visa',
            last_four='4242',
            is_default=True
        )
        
        self.assertEqual(pm.user, self.user)
        self.assertEqual(pm.method_type, 'CREDIT_CARD')
        self.assertTrue(pm.is_default)
    
    def test_create_payment(self):
        """Test creating a payment record"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            currency='NPR',
            status='PENDING'
        )
        
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, Decimal('1000.00'))
        self.assertEqual(payment.status, 'PENDING')
    
    def test_payment_status_transitions(self):
        """Test payment status transitions"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('500.00'),
            status='PENDING'
        )
        
        # Pending -> Processing
        payment.status = 'PROCESSING'
        payment.save()
        self.assertEqual(payment.status, 'PROCESSING')
        
        # Processing -> Completed
        payment.status = 'COMPLETED'
        payment.processed_at = timezone.now()
        payment.save()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertIsNotNone(payment.processed_at)


class PaymentServiceTests(TransactionTestCase):
    """Test PaymentService"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='serviceuser',
            email='service@example.com',
            password='testpass123',
            full_name='Service Test User',
            role='PLAYER'
        )
        self.service = PaymentService()
    
    def test_create_payment(self):
        """Test creating payment through service"""
        payment = self.service.create_payment(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1500.00'),
            description='Test tournament entry'
        )
        
        self.assertIsNotNone(payment.id)
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, Decimal('1500.00'))
        self.assertEqual(payment.status, 'PENDING')
    
    @patch('payments.services.KhaltiPaymentGateway.initiate_payment')
    def test_initiate_khalti_payment(self, mock_initiate):
        """Test initiating Khalti payment"""
        mock_initiate.return_value = {
            'pidx': 'test_pidx_123',
            'payment_url': 'https://test.khalti.com/pay',
            'expires_at': '2026-02-20T12:00:00Z'
        }
        
        payment = self.service.create_payment(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('2000.00')
        )
        
        customer_info = {
            'name': self.user.full_name,
            'email': self.user.email
        }
        
        response = self.service.initiate_khalti_payment(payment, customer_info)
        
        self.assertNotIn('error', response)
        self.assertEqual(response['pidx'], 'test_pidx_123')
        
        payment.refresh_from_db()
        self.assertEqual(payment.transaction_id, 'test_pidx_123')
        self.assertEqual(payment.status, 'PROCESSING')
    
    @patch('payments.services.KhaltiPaymentGateway.verify_payment')
    def test_verify_payment_success(self, mock_verify):
        """Test verifying successful payment"""
        mock_verify.return_value = {
            'pidx': 'test_pidx_123',
            'status': 'Completed',
            'transaction_id': 'txn_123'
        }
        
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='PROCESSING',
            transaction_id='test_pidx_123',
            payment_processor='KHALTI'
        )
        
        Transaction.objects.create(
            payment=payment,
            transaction_type='CHARGE',
            amount=payment.amount,
            currency='NPR',
            status='PENDING',
            external_transaction_id='test_pidx_123',
            payment_processor='KHALTI'
        )
        
        result = self.service.verify_payment(payment)
        
        self.assertEqual(result['status'], 'Completed')
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertIsNotNone(payment.processed_at)
    
    def test_process_refund(self):
        """Test processing a refund"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED',
            processed_at=timezone.now()
        )
        
        refund = self.service.process_refund(
            payment=payment,
            amount=Decimal('1000.00'),
            reason='Tournament cancelled'
        )
        
        self.assertIsNotNone(refund)
        self.assertEqual(refund.amount, Decimal('1000.00'))
        self.assertEqual(refund.status, 'COMPLETED')
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'REFUNDED')
    
    def test_refund_validation(self):
        """Test refund validation rules"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='PENDING'
        )
        
        # Cannot refund non-completed payment
        with self.assertRaises(ValueError):
            self.service.process_refund(payment, Decimal('500.00'), 'Test')
        
        payment.status = 'COMPLETED'
        payment.save()
        
        # Cannot refund more than payment amount
        with self.assertRaises(ValueError):
            self.service.process_refund(payment, Decimal('1500.00'), 'Test')


class TournamentPaymentServiceTests(TransactionTestCase):
    """Test TournamentPaymentService"""
    
    def setUp(self):
        self.organizer = User.objects.create_user(
            username='organizer',
            email='organizer@example.com',
            password='testpass123',
            full_name='Organizer',
            role='ORGANIZER'
        )
        
        self.player = User.objects.create_user(
            username='player',
            email='player@example.com',
            password='testpass123',
            full_name='Player',
            role='PLAYER'
        )
        
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            date=timezone.now().date() + timedelta(days=30),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=Decimal('1000.00'),
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20)
        )
        
        self.service = TournamentPaymentService()
    
    def test_calculate_refund_amount_30_days(self):
        """Test 100% refund for 30+ days before tournament"""
        payment = Payment.objects.create(
            user=self.player,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED'
        )
        
        refund_amount = self.service.calculate_refund_amount(self.tournament, payment)
        self.assertEqual(refund_amount, Decimal('1000.00'))
    
    def test_calculate_refund_amount_14_days(self):
        """Test 75% refund for 14-29 days before tournament"""
        self.tournament.date = timezone.now().date() + timedelta(days=20)
        self.tournament.save()
        
        payment = Payment.objects.create(
            user=self.player,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED'
        )
        
        refund_amount = self.service.calculate_refund_amount(self.tournament, payment)
        self.assertEqual(refund_amount, Decimal('750.00'))
    
    def test_calculate_refund_amount_7_days(self):
        """Test 50% refund for 7-13 days before tournament"""
        self.tournament.date = timezone.now().date() + timedelta(days=10)
        self.tournament.save()
        
        payment = Payment.objects.create(
            user=self.player,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED'
        )
        
        refund_amount = self.service.calculate_refund_amount(self.tournament, payment)
        self.assertEqual(refund_amount, Decimal('500.00'))
    
    def test_calculate_refund_amount_no_refund(self):
        """Test no refund for less than 7 days before tournament"""
        self.tournament.date = timezone.now().date() + timedelta(days=5)
        self.tournament.save()
        
        payment = Payment.objects.create(
            user=self.player,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED'
        )
        
        refund_amount = self.service.calculate_refund_amount(self.tournament, payment)
        self.assertEqual(refund_amount, Decimal('0'))


class VenuePaymentServiceTests(TransactionTestCase):
    """Test VenuePaymentService"""
    
    def setUp(self):
        self.owner = User.objects.create_user(
            username='venueowner',
            email='owner@example.com',
            password='testpass123',
            full_name='Venue Owner',
            role='VENUE_OWNER'
        )
        
        self.user = User.objects.create_user(
            username='venueuser',
            email='user@example.com',
            password='testpass123',
            full_name='User',
            role='PLAYER'
        )
        
        self.venue = Venue.objects.create(
            owner=self.owner,
            name='Test Venue',
            location='Test Location, Kathmandu',
            price_per_hour=Decimal('500.00'),
            capacity=50,
            sport_type='FUTSAL',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        self.service = VenuePaymentService()
    
    def test_calculate_booking_cost(self):
        """Test calculating venue booking cost"""
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=2)
        
        cost = self.service.calculate_booking_cost(self.venue, start_time, end_time)
        self.assertEqual(cost, Decimal('1000.00'))
    
    def test_calculate_cancellation_refund_48_hours(self):
        """Test 100% refund for cancellation 48+ hours before booking"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.user,
            date=timezone.now().date() + timedelta(days=3),
            start_time=(timezone.now() + timedelta(days=3)).time(),
            end_time=(timezone.now() + timedelta(days=3, hours=2)).time(),
            status='CONFIRMED',
            payment_status='COMPLETED',
            amount=Decimal('1000.00')
        )
        
        # Mock start_time as datetime for calculation
        booking.start_time = timezone.now() + timedelta(days=3)
        
        refund = self.service.calculate_cancellation_refund(booking)
        self.assertEqual(refund, Decimal('1000.00'))
    
    def test_calculate_cancellation_refund_no_refund(self):
        """Test no refund for cancellation less than 48 hours before booking"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.user,
            date=timezone.now().date() + timedelta(days=1),
            start_time=(timezone.now() + timedelta(days=1)).time(),
            end_time=(timezone.now() + timedelta(days=1, hours=2)).time(),
            status='CONFIRMED',
            payment_status='COMPLETED',
            amount=Decimal('1000.00')
        )
        
        # Mock start_time as datetime for calculation
        booking.start_time = timezone.now() + timedelta(hours=24)
        
        refund = self.service.calculate_cancellation_refund(booking)
        self.assertEqual(refund, Decimal('0'))


class RefereePaymentServiceTests(TransactionTestCase):
    """Test RefereePaymentService"""
    
    def setUp(self):
        self.organizer = User.objects.create_user(
            username='reforganizer',
            email='organizer@example.com',
            password='testpass123',
            full_name='Organizer',
            role='ORGANIZER'
        )
        
        self.referee = User.objects.create_user(
            username='referee',
            email='referee@example.com',
            password='testpass123',
            full_name='Referee',
            role='REFEREE'
        )
        
        self.service = RefereePaymentService()
    
    def test_hold_in_escrow(self):
        """Test holding payment in escrow"""
        payment = Payment.objects.create(
            user=self.organizer,
            payment_type='REFEREE_BOOKING',
            amount=Decimal('500.00'),
            status='PROCESSING'
        )
        
        self.service.hold_in_escrow(payment)
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
        self.assertTrue(payment.metadata.get('escrow'))
        self.assertIsNotNone(payment.processed_at)
    
    def test_release_to_referee_validation(self):
        """Test validation when releasing payment to referee"""
        payment = Payment.objects.create(
            user=self.organizer,
            payment_type='REFEREE_BOOKING',
            amount=Decimal('500.00'),
            status='PENDING'
        )
        
        # Create mock referee booking
        from tournaments.models import Tournament, Match
        
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=Decimal('1000.00'),
            max_participants=16,
            registration_deadline=timezone.now() + timedelta(days=10)
        )
        
        match = Match.objects.create(
            tournament=tournament,
            match_number=1,
            round_number=1,
            status='COMPLETED'
        )
        
        booking = RefereeBooking.objects.create(
            referee=self.referee,
            match=match,
            tournament=tournament,
            requested_by=self.organizer,
            match_date=timezone.now(),
            fee=Decimal('500.00'),
            status='ACCEPTED',
            payment=payment
        )
        
        # Cannot release payment not in escrow
        with self.assertRaises(ValueError):
            self.service.release_to_referee(booking)
        
        # Hold in escrow first
        self.service.hold_in_escrow(payment)
        
        # Now can release
        result = self.service.release_to_referee(booking)
        self.assertTrue(result)
        
        booking.refresh_from_db()
        self.assertTrue(booking.payment_released)
        self.assertIsNotNone(booking.payment_released_at)
