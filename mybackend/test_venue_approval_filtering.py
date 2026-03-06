"""
Test script to verify that unapproved venues are not shown in tournament creation.

This test verifies the fix for the issue where PENDING/REJECTED venues
were appearing in the available venues dropdown when creating tournaments.
"""

import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

# Add testserver to ALLOWED_HOSTS for testing
from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.contrib.auth import get_user_model
from venues.models import Venue
from rest_framework.test import APIClient
from datetime import datetime, timedelta

User = get_user_model()

def test_venue_approval_filtering():
    """Test that only APPROVED venues appear in tournament creation"""
    
    print("\n" + "="*80)
    print("TESTING VENUE APPROVAL STATUS FILTERING")
    print("="*80 + "\n")
    
    # Create test users
    print("1. Creating test users...")
    venue_owner = User.objects.filter(email='venue_owner@test.com').first()
    if not venue_owner:
        venue_owner = User.objects.create_user(
            username='venue_owner_test',
            email='venue_owner@test.com',
            password='testpass123',
            role='VENUE_OWNER',
            full_name='Test Venue Owner'
        )
    
    organizer = User.objects.filter(email='organizer@test.com').first()
    if not organizer:
        organizer = User.objects.create_user(
            username='organizer_test',
            email='organizer@test.com',
            password='testpass123',
            role='ORGANIZER',
            full_name='Test Organizer'
        )
    
    admin = User.objects.filter(email='admin@test.com').first()
    if not admin:
        admin = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='ADMIN',
            full_name='Test Admin'
        )
    
    print("   ✓ Users created/found")
    
    # Create test venues with different approval statuses
    print("\n2. Creating test venues with different approval statuses...")
    
    # Clean up existing test venues
    Venue.objects.filter(name__startswith='Test Venue').delete()
    
    approved_venue = Venue.objects.create(
        owner=venue_owner,
        name='Test Venue - APPROVED',
        location='Test Location 1',
        sport_type='FUTSAL',
        capacity=50,
        price_per_hour=1000.00,
        approval_status='APPROVED'
    )
    
    pending_venue = Venue.objects.create(
        owner=venue_owner,
        name='Test Venue - PENDING',
        location='Test Location 2',
        sport_type='FUTSAL',
        capacity=50,
        price_per_hour=1000.00,
        approval_status='PENDING'
    )
    
    rejected_venue = Venue.objects.create(
        owner=venue_owner,
        name='Test Venue - REJECTED',
        location='Test Location 3',
        sport_type='FUTSAL',
        capacity=50,
        price_per_hour=1000.00,
        approval_status='REJECTED'
    )
    
    conditional_venue = Venue.objects.create(
        owner=venue_owner,
        name='Test Venue - CONDITIONAL',
        location='Test Location 4',
        sport_type='FUTSAL',
        capacity=50,
        price_per_hour=1000.00,
        approval_status='CONDITIONAL_APPROVAL'
    )
    
    print(f"   ✓ Created 4 test venues:")
    print(f"     - {approved_venue.name} (ID: {approved_venue.id})")
    print(f"     - {pending_venue.name} (ID: {pending_venue.id})")
    print(f"     - {rejected_venue.name} (ID: {rejected_venue.id})")
    print(f"     - {conditional_venue.name} (ID: {conditional_venue.id})")
    
    # Test as ORGANIZER (should only see APPROVED venues)
    print("\n3. Testing as ORGANIZER...")
    client = APIClient()
    client.force_authenticate(user=organizer)
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    response = client.get('/api/venues/available-venues/', {
        'date': tomorrow,
        'start_time': '10:00',
        'end_time': '12:00',
        'sport_type': 'FUTSAL'
    })
    
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        venues = response.json().get('venues', [])
        venue_names = [v['name'] for v in venues if v['name'].startswith('Test Venue')]
        
        print(f"   Venues returned: {len(venue_names)}")
        for name in venue_names:
            print(f"     - {name}")
        
        # Check that only APPROVED venue is returned
        has_approved = any('APPROVED' in name for name in venue_names)
        has_pending = any('PENDING' in name for name in venue_names)
        has_rejected = any('REJECTED' in name for name in venue_names)
        has_conditional = any('CONDITIONAL' in name for name in venue_names)
        
        if has_approved and not has_pending and not has_rejected and not has_conditional:
            print("\n   ✅ SUCCESS: Only APPROVED venues are visible to ORGANIZER")
        else:
            print("\n   ❌ FAILURE: Unapproved venues are visible to ORGANIZER")
            print(f"      - Has APPROVED: {has_approved}")
            print(f"      - Has PENDING: {has_pending}")
            print(f"      - Has REJECTED: {has_rejected}")
            print(f"      - Has CONDITIONAL: {has_conditional}")
    else:
        print(f"   ❌ FAILURE: API returned status {response.status_code}")
        try:
            print(f"      Error: {response.json()}")
        except:
            print(f"      Error: {response.content.decode()[:200]}")
    
    # Test as ADMIN (should see all venues)
    print("\n4. Testing as ADMIN...")
    client.force_authenticate(user=admin)
    
    response = client.get('/api/venues/available-venues/', {
        'date': tomorrow,
        'start_time': '10:00',
        'end_time': '12:00',
        'sport_type': 'FUTSAL'
    })
    
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        venues = response.json().get('venues', [])
        venue_names = [v['name'] for v in venues if v['name'].startswith('Test Venue')]
        
        print(f"   Venues returned: {len(venue_names)}")
        for name in venue_names:
            print(f"     - {name}")
        
        # Check that all venues are returned for admin
        has_approved = any('APPROVED' in name for name in venue_names)
        has_pending = any('PENDING' in name for name in venue_names)
        has_rejected = any('REJECTED' in name for name in venue_names)
        has_conditional = any('CONDITIONAL' in name for name in venue_names)
        
        if has_approved and has_pending and has_rejected and has_conditional:
            print("\n   ✅ SUCCESS: All venues are visible to ADMIN")
        else:
            print("\n   ⚠️  WARNING: Not all venues visible to ADMIN")
            print(f"      - Has APPROVED: {has_approved}")
            print(f"      - Has PENDING: {has_pending}")
            print(f"      - Has REJECTED: {has_rejected}")
            print(f"      - Has CONDITIONAL: {has_conditional}")
    else:
        print(f"   ❌ FAILURE: API returned status {response.status_code}")
        try:
            print(f"      Error: {response.json()}")
        except:
            print(f"      Error: {response.content.decode()[:200]}")
    
    # Test as VENUE_OWNER (should see their own venues + all APPROVED)
    print("\n5. Testing as VENUE_OWNER...")
    client.force_authenticate(user=venue_owner)
    
    response = client.get('/api/venues/available-venues/', {
        'date': tomorrow,
        'start_time': '10:00',
        'end_time': '12:00',
        'sport_type': 'FUTSAL'
    })
    
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        venues = response.json().get('venues', [])
        venue_names = [v['name'] for v in venues if v['name'].startswith('Test Venue')]
        
        print(f"   Venues returned: {len(venue_names)}")
        for name in venue_names:
            print(f"     - {name}")
        
        # Check that venue owner sees their own venues (all statuses)
        has_approved = any('APPROVED' in name for name in venue_names)
        has_pending = any('PENDING' in name for name in venue_names)
        has_rejected = any('REJECTED' in name for name in venue_names)
        has_conditional = any('CONDITIONAL' in name for name in venue_names)
        
        if has_approved and has_pending and has_rejected and has_conditional:
            print("\n   ✅ SUCCESS: Venue owner can see all their venues")
        else:
            print("\n   ⚠️  WARNING: Venue owner cannot see all their venues")
            print(f"      - Has APPROVED: {has_approved}")
            print(f"      - Has PENDING: {has_pending}")
            print(f"      - Has REJECTED: {has_rejected}")
            print(f"      - Has CONDITIONAL: {has_conditional}")
    else:
        print(f"   ❌ FAILURE: API returned status {response.status_code}")
        try:
            print(f"      Error: {response.json()}")
        except:
            print(f"      Error: {response.content.decode()[:200]}")
    
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80 + "\n")

if __name__ == '__main__':
    test_venue_approval_filtering()
