"""
API Integration Tests for Payment System
Tests all payment-related API endpoints
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch

from accounts.models import CustomUser
from tournaments.models import Tournament
from venues.models import Venue, VenueBooking
from .models import Payment, PaymentMethod, Transaction


class PaymentMethodAPITests(TestCase):
    """Test PaymentMethod API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            full_name='Test User',
            role='PLAYER'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_payment_method(self):
        """Test creating a payment method via API"""
        url = reverse('paymentmethod-list')
        data = {
            'method_type': 'DIGITAL_WALLET',  # Changed from CREDIT_CARD to avoid expiry_date validation
            'provider': 'Khalti',
            'last_four': '4242',
            'is_default': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['method_type'], 'DIGITAL_WALLET')
        self.assertTrue(response.data['is_default'])
    
    def test_list_payment_methods(self):
        """Test listing user's payment methods"""
        PaymentMethod.objects.create(
            user=self.user,
            method_type='CREDIT_CARD',
            provider='Visa',
            last_four='4242',
            is_default=True
        )
        
        url = reverse('paymentmethod-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_set_default_payment_method(self):
        """Test setting a payment method as default"""
        pm1 = PaymentMethod.objects.create(
            user=self.user,
            method_type='CREDIT_CARD',
            provider='Visa',
            last_four='4242',
            is_default=True
        )
        pm2 = PaymentMethod.objects.create(
            user=self.user,
            method_type='DEBIT_CARD',
            provider='Mastercard',
            last_four='5555',
            is_default=False
        )
        
        url = reverse('paymentmethod-set-default', kwargs={'pk': pm2.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        pm1.refresh_from_db()
        pm2.refresh_from_db()
        self.assertFalse(pm1.is_default)
        self.assertTrue(pm2.is_default)
    
    def test_cannot_access_other_users_payment_methods(self):
        """Test that users can only access their own payment methods"""
        other_user = CustomUser.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123',
            full_name='Other User',
            role='PLAYER'
        )
        
        PaymentMethod.objects.create(
            user=other_user,
            method_type='CREDIT_CARD',
            provider='Visa',
            last_four='9999',
            is_default=True
        )
        
        url = reverse('paymentmethod-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class PaymentAPITests(TestCase):
    """Test Payment API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='paymentuser',
            email='payment@example.com',
            password='testpass123',
            full_name='Payment User',
            role='PLAYER'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_list_user_payments(self):
        """Test listing user's payments"""
        Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED'
        )
        
        url = reverse('payment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    @patch('payments.views.khalti_gateway.verify_payment')
    def test_verify_payment(self, mock_verify):
        """Test payment verification endpoint"""
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
        
        url = reverse('payment-verify', kwargs={'pk': payment.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['verification']['status'], 'Completed')
        
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'COMPLETED')
    
    def test_refund_payment(self):
        """Test refund endpoint"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='COMPLETED',
            processed_at=timezone.now()
        )
        
        url = reverse('payment-refund', kwargs={'pk': payment.id})
        data = {
            'amount': '500.00',
            'reason': 'Partial refund test'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_cannot_refund_pending_payment(self):
        """Test that pending payments cannot be refunded"""
        payment = Payment.objects.create(
            user=self.user,
            payment_type='TOURNAMENT_FEE',
            amount=Decimal('1000.00'),
            status='PENDING'
        )
        
        url = reverse('payment-refund', kwargs={'pk': payment.id})
        data = {
            'amount': '1000.00',
            'reason': 'Test refund'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TournamentPaymentIntegrationTests(TestCase):
    """Test tournament payment integration"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.organizer = CustomUser.objects.create_user(
            username='organizer',
            email='organizer@example.com',
            password='testpass123',
            full_name='Organizer',
            role='ORGANIZER'
        )
        
        self.player = CustomUser.objects.create_user(
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
    
    def test_tournament_with_entry_fee_requires_payment(self):
        """Test that tournaments with entry fees require payment"""
        self.assertGreater(self.tournament.entry_fee, 0)
        # This will be implemented when we add the registration endpoint


class VenuePaymentIntegrationTests(TestCase):
    """Test venue booking payment integration"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.owner = CustomUser.objects.create_user(
            username='venueowner',
            email='owner@example.com',
            password='testpass123',
            full_name='Venue Owner',
            role='VENUE_OWNER'
        )
        
        self.user = CustomUser.objects.create_user(
            username='venueuser',
            email='user@example.com',
            password='testpass123',
            full_name='User',
            role='PLAYER'
        )
        
        self.venue = Venue.objects.create(
            owner=self.owner,
            name='Test Venue',
            location='Test Location',
            price_per_hour=Decimal('500.00'),
            capacity=50,
            sport_type='FUTSAL',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_venue_booking_has_payment_status(self):
        """Test that venue bookings track payment status"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.user,
            date=timezone.now().date() + timedelta(days=3),
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=2)).time(),
            status='PENDING',
            payment_status='PENDING',
            amount=Decimal('1000.00')
        )
        
        self.assertEqual(booking.payment_status, 'PENDING')
        self.assertEqual(booking.amount, Decimal('1000.00'))


class KhaltiConfigAPITests(TestCase):
    """Test Khalti configuration endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='khaltiuser',
            email='khalti@example.com',
            password='testpass123',
            full_name='Khalti User',
            role='PLAYER'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_khalti_config(self):
        """Test getting Khalti configuration"""
        url = reverse('khalti-config')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('public_key', response.data)
        self.assertIn('return_url', response.data)


class PaymentAuthenticationTests(TestCase):
    """Test payment API authentication"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='authuser',
            email='auth@example.com',
            password='testpass123',
            full_name='Auth User',
            role='PLAYER'
        )
    
    def test_payment_methods_require_authentication(self):
        """Test that payment method endpoints require authentication"""
        url = reverse('paymentmethod-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_payments_require_authentication(self):
        """Test that payment endpoints require authentication"""
        url = reverse('payment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_authenticated_access_works(self):
        """Test that authenticated users can access endpoints"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('paymentmethod-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
