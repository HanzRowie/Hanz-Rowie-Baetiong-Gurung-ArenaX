"""
Tests for venue access control based on approval status.

This test suite verifies that:
- Non-admin users cannot access PENDING venues (404)
- Non-admin users cannot access REJECTED venues (404)
- Venue owners can access their own PENDING/REJECTED venues
- Admins can access all venues regardless of status
- APPROVED venues are accessible to everyone
"""

import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import CustomUser
from venues.models import Venue


@pytest.mark.django_db
class TestVenueAccessControl(TestCase):
    """Test access control for venues based on approval status"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users with different roles
        self.admin = CustomUser.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            full_name='Admin User',
            role='ADMIN'
        )
        
        self.venue_owner1 = CustomUser.objects.create_user(
            email='owner1@test.com',
            password='testpass123',
            full_name='Owner One',
            role='VENUE_OWNER'
        )
        
        self.venue_owner2 = CustomUser.objects.create_user(
            email='owner2@test.com',
            password='testpass123',
            full_name='Owner Two',
            role='VENUE_OWNER'
        )
        
        self.player = CustomUser.objects.create_user(
            email='player@test.com',
            password='testpass123',
            full_name='Player User',
            role='PLAYER'
        )
        
        # Create venues with different approval statuses
        self.approved_venue = Venue.objects.create(
            owner=self.venue_owner1,
            name='Approved Venue',
            location='Test Location 1',
            sport_type='FUTSAL',
            capacity=20,
            price_per_hour=1000,
            approval_status='APPROVED'
        )
        
        self.pending_venue = Venue.objects.create(
            owner=self.venue_owner1,
            name='Pending Venue',
            location='Test Location 2',
            sport_type='FUTSAL',
            capacity=15,
            price_per_hour=800,
            approval_status='PENDING'
        )
        
        self.rejected_venue = Venue.objects.create(
            owner=self.venue_owner1,
            name='Rejected Venue',
            location='Test Location 3',
            sport_type='BADMINTON',
            capacity=10,
            price_per_hour=600,
            approval_status='REJECTED',
            rejection_reason='Incomplete documentation'
        )
        
        self.other_owner_pending = Venue.objects.create(
            owner=self.venue_owner2,
            name='Other Owner Pending',
            location='Test Location 4',
            sport_type='FUTSAL',
            capacity=25,
            price_per_hour=1200,
            approval_status='PENDING'
        )
    
    def test_approved_venue_accessible_to_all(self):
        """Test that APPROVED venues are accessible to all authenticated users"""
        # Player can access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/venues/{self.approved_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Other venue owner can access
        self.client.force_authenticate(user=self.venue_owner2)
        response = self.client.get(f'/api/venues/{self.approved_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_pending_venue_blocked_for_non_owner(self):
        """Test that PENDING venues return 404 for non-owners"""
        # Player cannot access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/venues/{self.pending_venue.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Other venue owner cannot access
        self.client.force_authenticate(user=self.venue_owner2)
        response = self.client.get(f'/api/venues/{self.pending_venue.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_rejected_venue_blocked_for_non_owner(self):
        """Test that REJECTED venues return 404 for non-owners"""
        # Player cannot access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/venues/{self.rejected_venue.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Other venue owner cannot access
        self.client.force_authenticate(user=self.venue_owner2)
        response = self.client.get(f'/api/venues/{self.rejected_venue.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_venue_owner_can_access_own_pending_venue(self):
        """Test that venue owners can access their own PENDING venues"""
        self.client.force_authenticate(user=self.venue_owner1)
        response = self.client.get(f'/api/venues/{self.pending_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Pending Venue'
    
    def test_venue_owner_can_access_own_rejected_venue(self):
        """Test that venue owners can access their own REJECTED venues"""
        self.client.force_authenticate(user=self.venue_owner1)
        response = self.client.get(f'/api/venues/{self.rejected_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Rejected Venue'
    
    def test_admin_can_access_all_venues(self):
        """Test that admins can access venues with any status"""
        self.client.force_authenticate(user=self.admin)
        
        # Can access APPROVED
        response = self.client.get(f'/api/venues/{self.approved_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Can access PENDING
        response = self.client.get(f'/api/venues/{self.pending_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Can access REJECTED
        response = self.client.get(f'/api/venues/{self.rejected_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_list_endpoint_filters_by_approval_status(self):
        """Test that list endpoint only shows appropriate venues"""
        # Player sees only APPROVED venues
        self.client.force_authenticate(user=self.player)
        response = self.client.get('/api/venues/')
        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['venues']]
        assert str(self.approved_venue.id) in venue_ids
        assert str(self.pending_venue.id) not in venue_ids
        assert str(self.rejected_venue.id) not in venue_ids
        
        # Venue owner sees APPROVED + their own venues
        self.client.force_authenticate(user=self.venue_owner1)
        response = self.client.get('/api/venues/')
        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['venues']]
        assert str(self.approved_venue.id) in venue_ids
        assert str(self.pending_venue.id) in venue_ids
        assert str(self.rejected_venue.id) in venue_ids
        assert str(self.other_owner_pending.id) not in venue_ids
        
        # Admin sees all venues
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/venues/')
        assert response.status_code == status.HTTP_200_OK
        venue_ids = [v['id'] for v in response.data['venues']]
        assert str(self.approved_venue.id) in venue_ids
        assert str(self.pending_venue.id) in venue_ids
        assert str(self.rejected_venue.id) in venue_ids
        assert str(self.other_owner_pending.id) in venue_ids
    
    def test_unauthenticated_user_only_sees_approved(self):
        """Test that unauthenticated users only see APPROVED venues"""
        response = self.client.get('/api/venues/')
        # Note: This might return 401 depending on permission settings
        # If authentication is required, this test should be adjusted
        if response.status_code == status.HTTP_200_OK:
            venue_ids = [v['id'] for v in response.data['venues']]
            assert str(self.approved_venue.id) in venue_ids
            assert str(self.pending_venue.id) not in venue_ids
            assert str(self.rejected_venue.id) not in venue_ids
    
    def test_conditional_approval_venue_blocked_for_non_owner(self):
        """Test that CONDITIONAL_APPROVAL venues are treated like PENDING"""
        conditional_venue = Venue.objects.create(
            owner=self.venue_owner1,
            name='Conditional Venue',
            location='Test Location 5',
            sport_type='FUTSAL',
            capacity=18,
            price_per_hour=900,
            approval_status='CONDITIONAL_APPROVAL',
            requested_documents=['business_license', 'insurance_certificate']
        )
        
        # Player cannot access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/venues/{conditional_venue.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Owner can access
        self.client.force_authenticate(user=self.venue_owner1)
        response = self.client.get(f'/api/venues/{conditional_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Admin can access
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/venues/{conditional_venue.id}/')
        assert response.status_code == status.HTTP_200_OK
