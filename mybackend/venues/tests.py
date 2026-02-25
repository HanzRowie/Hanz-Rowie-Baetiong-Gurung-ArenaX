from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, time, timedelta
from venues.models import Venue, VenueBooking
from payments.models import Payment

User = get_user_model()


def create_test_user(username, email, role, full_name, phone='9841234567'):
    """Helper function to create test users"""
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123',
        role=role,
        full_name=full_name,
        phone_number=phone
    )


class VenuePaymentTests(TestCase):
    """Test venue booking with payment integration"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.venue_owner = create_test_user('owner', 'owner@test.com', 'VENUE_OWNER', 'Venue Owner')
        self.player = create_test_user('player', 'player@test.com', 'PLAYER', 'Test Player', '9841234568')
        self.organizer = create_test_user('organizer', 'organizer@test.com', 'ORGANIZER', 'Test Organizer', '9841234569')
        
        # Create venue
        self.venue = Venue.objects.create(
            owner=self.venue_owner,
            name='Test Futsal Arena',
            location='Kathmandu, Nepal',
            sport_type='FUTSAL',
            capacity=10,
            price_per_hour=Decimal('1000.00'),
            operating_days=[1, 2, 3, 4, 5, 6, 7],
            is_active=True
        )
        
        self.client = APIClient()
    
    def test_calculate_booking_cost(self):
        """Test cost calculation endpoint"""
        self.client.force_authenticate(user=self.player)
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/calculate-cost/',
            {
                'start_time': '10:00',
                'end_time': '12:00'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('breakdown', response.data)
        self.assertIn('venue', response.data)
        self.assertIn('policies', response.data)
        
        # Check calculations
        breakdown = response.data['breakdown']
        self.assertEqual(breakdown['base_price'], 2000.00)  # 1000 * 2 hours
        self.assertEqual(breakdown['service_fee'], 100.00)  # 5% of 2000
        self.assertEqual(breakdown['total'], 2100.00)
        self.assertEqual(breakdown['service_fee_percentage'], 5)
        
        # Check duration
        self.assertEqual(response.data['duration_hours'], 2.0)
        
        # Check policies
        policies = response.data['policies']
        self.assertIn('cancellation', policies)
        self.assertIn('refund', policies)
        self.assertTrue(policies['instant_confirmation'])
    
    def test_calculate_cost_invalid_time(self):
        """Test cost calculation with invalid time"""
        self.client.force_authenticate(user=self.player)
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/calculate-cost/',
            {
                'start_time': '12:00',
                'end_time': '10:00'  # End before start
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_book_venue_with_payment(self):
        """Test booking venue creates payment"""
        self.client.force_authenticate(user=self.player)
        
        booking_date = (date.today() + timedelta(days=7)).isoformat()
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': booking_date,
                'start_time': '10:00',
                'end_time': '12:00',
                'purpose': 'Team practice'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('booking', response.data)
        self.assertIn('payment', response.data)
        self.assertIn('payment_url', response.data)
        self.assertIn('pidx', response.data)
        
        # Verify booking created
        booking = response.data['booking']
        self.assertEqual(booking['status'], 'PENDING')
        self.assertEqual(booking['payment_status'], 'PENDING')
        self.assertEqual(float(booking['amount']), 2000.00)
        
        # Verify payment created
        payment = response.data['payment']
        self.assertEqual(payment['payment_type'], 'VENUE_BOOKING')
        self.assertEqual(float(payment['amount']), 2000.00)
        self.assertIn(payment['status'], ['PENDING', 'PROCESSING'])  # Can be either after initiation
        
        # Verify in database
        booking_obj = VenueBooking.objects.get(id=booking['id'])
        self.assertEqual(booking_obj.user, self.player)
        self.assertEqual(booking_obj.venue, self.venue)
        self.assertEqual(booking_obj.status, 'PENDING')
        
        payment_obj = Payment.objects.get(id=payment['id'])
        self.assertEqual(payment_obj.user, self.player)
        self.assertEqual(payment_obj.venue_booking, booking_obj)
    
    def test_book_venue_missing_fields(self):
        """Test booking with missing required fields"""
        self.client.force_authenticate(user=self.player)
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': '2026-03-15',
                'start_time': '10:00'
                # Missing end_time
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_book_venue_unauthenticated(self):
        """Test booking without authentication"""
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': '2026-03-15',
                'start_time': '10:00',
                'end_time': '12:00'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_amount_calculation(self):
        """Test automatic amount calculation"""
        self.client.force_authenticate(user=self.player)
        
        booking_date = (date.today() + timedelta(days=7)).isoformat()
        
        # Test 3 hour booking
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': booking_date,
                'start_time': '10:00',
                'end_time': '13:00',  # 3 hours
                'purpose': 'Tournament'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['booking']['amount']), 3000.00)
    
    def test_organizer_can_book_venue(self):
        """Test organizer can book venue for tournament"""
        self.client.force_authenticate(user=self.organizer)
        
        booking_date = (date.today() + timedelta(days=7)).isoformat()
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': booking_date,
                'start_time': '09:00',
                'end_time': '17:00',  # 8 hours for tournament
                'purpose': 'Spring Championship'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['booking']['amount']), 8000.00)
        self.assertEqual(response.data['booking']['purpose'], 'Spring Championship')
    
    def test_payment_mock_mode(self):
        """Test payment in mock mode"""
        self.client.force_authenticate(user=self.player)
        
        booking_date = (date.today() + timedelta(days=7)).isoformat()
        
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/book/',
            {
                'date': booking_date,
                'start_time': '10:00',
                'end_time': '12:00',
                'purpose': 'Test'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check mock payment - pidx should exist
        pidx = response.data.get('pidx')
        self.assertIsNotNone(pidx)
        
        # Check payment URL exists
        payment_url = response.data.get('payment_url')
        self.assertIsNotNone(payment_url)


class VenueBookingModelTests(TestCase):
    """Test VenueBooking model"""
    
    def setUp(self):
        self.venue_owner = create_test_user('owner2', 'owner2@test.com', 'VENUE_OWNER', 'Venue Owner')
        self.player = create_test_user('player2', 'player2@test.com', 'PLAYER', 'Test Player')
        
        self.venue = Venue.objects.create(
            owner=self.venue_owner,
            name='Test Arena',
            location='Test Location',
            sport_type='FUTSAL',
            capacity=10,
            price_per_hour=Decimal('1000.00'),
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
    
    def test_amount_auto_calculation(self):
        """Test amount is automatically calculated on save"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.player,
            date=date.today() + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(12, 0),
            purpose='Test'
        )
        
        # Amount should be auto-calculated: 1000 * 2 = 2000
        self.assertEqual(booking.amount, Decimal('2000.00'))
    
    def test_amount_calculation_half_hour(self):
        """Test amount calculation with half hour"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.player,
            date=date.today() + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(10, 30),  # 0.5 hours
            purpose='Test'
        )
        
        self.assertEqual(booking.amount, Decimal('500.00'))
    
    def test_booking_status_defaults(self):
        """Test booking status defaults"""
        booking = VenueBooking.objects.create(
            venue=self.venue,
            user=self.player,
            date=date.today() + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(12, 0)
        )
        
        self.assertEqual(booking.status, 'PENDING')
        self.assertEqual(booking.payment_status, 'PENDING')


class VenueCostCalculatorTests(TestCase):
    """Test cost calculator functionality"""
    
    def setUp(self):
        self.venue_owner = create_test_user('owner3', 'owner3@test.com', 'VENUE_OWNER', 'Venue Owner')
        self.player = create_test_user('player3', 'player3@test.com', 'PLAYER', 'Test Player')
        
        self.venue = Venue.objects.create(
            owner=self.venue_owner,
            name='Premium Arena',
            location='Kathmandu',
            sport_type='BADMINTON',
            capacity=4,
            price_per_hour=Decimal('1500.00'),
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.player)
    
    def test_different_durations(self):
        """Test cost calculation for different durations"""
        test_cases = [
            ('10:00', '11:00', 1.0, 1500.00, 75.00, 1575.00),
            ('10:00', '12:00', 2.0, 3000.00, 150.00, 3150.00),
            ('10:00', '13:30', 3.5, 5250.00, 262.50, 5512.50),
            ('09:00', '17:00', 8.0, 12000.00, 600.00, 12600.00),
        ]
        
        for start, end, hours, base, fee, total in test_cases:
            with self.subTest(start=start, end=end):
                response = self.client.post(
                    f'/api/venues/venues/{self.venue.id}/calculate-cost/',
                    {'start_time': start, 'end_time': end},
                    format='json'
                )
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['duration_hours'], hours)
                self.assertEqual(response.data['breakdown']['base_price'], base)
                self.assertEqual(response.data['breakdown']['service_fee'], fee)
                self.assertEqual(response.data['breakdown']['total'], total)
    
    def test_formatted_output(self):
        """Test formatted output strings"""
        response = self.client.post(
            f'/api/venues/venues/{self.venue.id}/calculate-cost/',
            {'start_time': '10:00', 'end_time': '12:00'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('formatted', response.data)
        self.assertIn('calculation', response.data['formatted'])
        self.assertIn('total', response.data['formatted'])
        
        # Check format includes currency and calculations
        calc = response.data['formatted']['calculation']
        self.assertIn('NPR', calc)
        self.assertIn('1,500', calc)
        self.assertIn('2.0', calc)


print("✅ Venue payment tests loaded successfully")
