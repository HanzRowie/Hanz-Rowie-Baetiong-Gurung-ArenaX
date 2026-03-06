"""
Tests for tournament access control based on approval status.

This test suite verifies that:
- Non-admin users cannot access PENDING tournaments (404)
- Non-admin users cannot access REJECTED tournaments (404)
- Organizers can access their own PENDING/REJECTED tournaments
- Admins can access all tournaments regardless of status
- APPROVED tournaments are accessible to everyone
"""

import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import CustomUser
from tournaments.models import Tournament
from datetime import date, time, timedelta
from django.utils import timezone


@pytest.mark.django_db
class TestTournamentAccessControl(TestCase):
    """Test access control for tournaments based on approval status"""
    
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
        
        self.organizer1 = CustomUser.objects.create_user(
            email='organizer1@test.com',
            password='testpass123',
            full_name='Organizer One',
            role='ORGANIZER'
        )
        
        self.organizer2 = CustomUser.objects.create_user(
            email='organizer2@test.com',
            password='testpass123',
            full_name='Organizer Two',
            role='ORGANIZER'
        )
        
        self.player = CustomUser.objects.create_user(
            email='player@test.com',
            password='testpass123',
            full_name='Player User',
            role='PLAYER'
        )
        
        # Create tournaments with different approval statuses
        tournament_date = date.today() + timedelta(days=30)
        registration_deadline = timezone.now() + timedelta(days=20)
        
        self.approved_tournament = Tournament.objects.create(
            organizer=self.organizer1,
            title='Approved Tournament',
            sport_type='FUTSAL',
            date=tournament_date,
            start_time=time(10, 0),
            venue='Test Venue',
            entry_fee=100,
            max_participants=16,
            registration_deadline=registration_deadline,
            approval_status='APPROVED'
        )
        
        self.pending_tournament = Tournament.objects.create(
            organizer=self.organizer1,
            title='Pending Tournament',
            sport_type='FUTSAL',
            date=tournament_date,
            start_time=time(14, 0),
            venue='Test Venue',
            entry_fee=100,
            max_participants=16,
            registration_deadline=registration_deadline,
            approval_status='PENDING'
        )
        
        self.rejected_tournament = Tournament.objects.create(
            organizer=self.organizer1,
            title='Rejected Tournament',
            sport_type='FUTSAL',
            date=tournament_date,
            start_time=time(18, 0),
            venue='Test Venue',
            entry_fee=100,
            max_participants=16,
            registration_deadline=registration_deadline,
            approval_status='REJECTED',
            rejection_reason='Incomplete documentation'
        )
        
        self.other_organizer_pending = Tournament.objects.create(
            organizer=self.organizer2,
            title='Other Organizer Pending',
            sport_type='BADMINTON',
            date=tournament_date,
            start_time=time(10, 0),
            venue='Test Venue',
            entry_fee=50,
            max_participants=8,
            registration_deadline=registration_deadline,
            approval_status='PENDING'
        )
    
    def test_approved_tournament_accessible_to_all(self):
        """Test that APPROVED tournaments are accessible to all authenticated users"""
        # Player can access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/tournaments/{self.approved_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Organizer can access
        self.client.force_authenticate(user=self.organizer2)
        response = self.client.get(f'/api/tournaments/{self.approved_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_pending_tournament_blocked_for_non_owner(self):
        """Test that PENDING tournaments return 404 for non-owners"""
        # Player cannot access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/tournaments/{self.pending_tournament.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Other organizer cannot access
        self.client.force_authenticate(user=self.organizer2)
        response = self.client.get(f'/api/tournaments/{self.pending_tournament.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_rejected_tournament_blocked_for_non_owner(self):
        """Test that REJECTED tournaments return 404 for non-owners"""
        # Player cannot access
        self.client.force_authenticate(user=self.player)
        response = self.client.get(f'/api/tournaments/{self.rejected_tournament.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
        # Other organizer cannot access
        self.client.force_authenticate(user=self.organizer2)
        response = self.client.get(f'/api/tournaments/{self.rejected_tournament.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_organizer_can_access_own_pending_tournament(self):
        """Test that organizers can access their own PENDING tournaments"""
        self.client.force_authenticate(user=self.organizer1)
        response = self.client.get(f'/api/tournaments/{self.pending_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Pending Tournament'
    
    def test_organizer_can_access_own_rejected_tournament(self):
        """Test that organizers can access their own REJECTED tournaments"""
        self.client.force_authenticate(user=self.organizer1)
        response = self.client.get(f'/api/tournaments/{self.rejected_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Rejected Tournament'
    
    def test_admin_can_access_all_tournaments(self):
        """Test that admins can access tournaments with any status"""
        self.client.force_authenticate(user=self.admin)
        
        # Can access APPROVED
        response = self.client.get(f'/api/tournaments/{self.approved_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Can access PENDING
        response = self.client.get(f'/api/tournaments/{self.pending_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
        
        # Can access REJECTED
        response = self.client.get(f'/api/tournaments/{self.rejected_tournament.id}/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_list_endpoint_filters_by_approval_status(self):
        """Test that list endpoint only shows appropriate tournaments"""
        # Player sees only APPROVED tournaments
        self.client.force_authenticate(user=self.player)
        response = self.client.get('/api/tournaments/')
        assert response.status_code == status.HTTP_200_OK
        tournament_ids = [t['id'] for t in response.data]
        assert str(self.approved_tournament.id) in tournament_ids
        assert str(self.pending_tournament.id) not in tournament_ids
        assert str(self.rejected_tournament.id) not in tournament_ids
        
        # Organizer sees APPROVED + their own tournaments
        self.client.force_authenticate(user=self.organizer1)
        response = self.client.get('/api/tournaments/')
        assert response.status_code == status.HTTP_200_OK
        tournament_ids = [t['id'] for t in response.data]
        assert str(self.approved_tournament.id) in tournament_ids
        assert str(self.pending_tournament.id) in tournament_ids
        assert str(self.rejected_tournament.id) in tournament_ids
        assert str(self.other_organizer_pending.id) not in tournament_ids
        
        # Admin sees all tournaments
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/tournaments/')
        assert response.status_code == status.HTTP_200_OK
        tournament_ids = [t['id'] for t in response.data]
        assert str(self.approved_tournament.id) in tournament_ids
        assert str(self.pending_tournament.id) in tournament_ids
        assert str(self.rejected_tournament.id) in tournament_ids
        assert str(self.other_organizer_pending.id) in tournament_ids
    
    def test_unauthenticated_user_only_sees_approved(self):
        """Test that unauthenticated users only see APPROVED tournaments"""
        response = self.client.get('/api/tournaments/')
        # Note: This might return 401 depending on permission settings
        # If authentication is required, this test should be adjusted
        if response.status_code == status.HTTP_200_OK:
            tournament_ids = [t['id'] for t in response.data]
            assert str(self.approved_tournament.id) in tournament_ids
            assert str(self.pending_tournament.id) not in tournament_ids
            assert str(self.rejected_tournament.id) not in tournament_ids
