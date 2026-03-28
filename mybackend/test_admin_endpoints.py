"""
Test script to verify admin endpoints for venues, tournaments, and users
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from venues.models import Venue
from tournaments.models import Tournament
from decimal import Decimal
from datetime import time

User = get_user_model()

def test_admin_endpoints():
    """Test all admin endpoints to verify they work correctly"""
    
    print("=" * 80)
    print("ADMIN ENDPOINTS TEST")
    print("=" * 80)
    
    # Create test admin user
    admin_user = User.objects.filter(role='ADMIN').first()
    if not admin_user:
        print("❌ No admin user found. Creating one...")
        admin_user = User.objects.create_user(
            email='testadmin@test.com',
            password='testpass123',
            full_name='Test Admin',
            role='ADMIN',
            approval_status='APPROVED'
        )
        print(f"✅ Created admin user: {admin_user.email}")
    else:
        print(f"✅ Using existing admin user: {admin_user.email}")
    
    # Create test venue owner
    venue_owner = User.objects.filter(role='VENUE_OWNER').first()
    if not venue_owner:
        print("Creating test venue owner...")
        venue_owner = User.objects.create_user(
            email='venueowner@test.com',
            password='testpass123',
            full_name='Test Venue Owner',
            role='VENUE_OWNER',
            approval_status='APPROVED'
        )
        print(f"✅ Created venue owner: {venue_owner.email}")
    
    # Create test venue
    test_venue = Venue.objects.filter(owner=venue_owner).first()
    if not test_venue:
        print("Creating test venue...")
        test_venue = Venue.objects.create(
            owner=venue_owner,
            name='Test Venue',
            location='Test Location, Kathmandu',
            latitude=Decimal('27.7172'),
            longitude=Decimal('85.3240'),
            sport_types=['FUTSAL', 'BADMINTON'],
            capacity=20,
            price_per_hour=Decimal('1000.00'),
            approval_status='PENDING',
            default_opening_time=time(6, 0),
            default_closing_time=time(22, 0),
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        print(f"✅ Created test venue: {test_venue.name}")
    
    # Setup API client
    client = APIClient()
    client.force_authenticate(user=admin_user)
    
    # Set SERVER_NAME to avoid ALLOWED_HOSTS issues
    client.defaults['SERVER_NAME'] = 'localhost'
    
    print("\n" + "=" * 80)
    print("TEST 1: Venue List Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/venues/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved {data.get('count', 0)} venues")
        if data.get('results'):
            print(f"Sample venue: {data['results'][0].get('name', 'N/A')}")
            print(f"Fields returned: {list(data['results'][0].keys())}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 2: Venue Detail Endpoint")
    print("=" * 80)
    
    response = client.get(f'/api/admin/venues/{test_venue.id}/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved venue: {data.get('name', 'N/A')}")
        print(f"Location: {data.get('location', 'N/A')}")
        print(f"Sport Types: {data.get('sport_types', 'N/A')}")
        print(f"Approval Status: {data.get('approval_status', 'N/A')}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 3: Venue Statistics Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/venues/stats/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved venue statistics")
        print(f"Total: {data.get('total', 0)}")
        print(f"Pending: {data.get('pending', 0)}")
        print(f"Approved: {data.get('approved', 0)}")
        print(f"Rejected: {data.get('rejected', 0)}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 4: Tournament List Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/tournaments/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved {data.get('count', 0)} tournaments")
        if data.get('results'):
            print(f"Sample tournament: {data['results'][0].get('name', 'N/A')}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 5: Tournament Statistics Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/tournaments/stats/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved tournament statistics")
        print(f"Total: {data.get('total', 0)}")
        print(f"Pending: {data.get('pending', 0)}")
        print(f"Approved: {data.get('approved', 0)}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 6: User List Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/users/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved {data.get('count', 0)} users")
        if data.get('results'):
            print(f"Sample user: {data['results'][0].get('full_name', 'N/A')}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TEST 7: User Statistics Endpoint")
    print("=" * 80)
    
    response = client.get('/api/admin/users/stats/')
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS - Retrieved user statistics")
        print(f"Total: {data.get('total', 0)}")
        print(f"Pending: {data.get('pending', 0)}")
        print(f"Approved: {data.get('approved', 0)}")
    else:
        print(f"❌ FAILED - {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            print(f"Error: {response.content.decode()[:500]}")
    
    print("\n" + "=" * 80)
    print("TESTS COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    test_admin_endpoints()
