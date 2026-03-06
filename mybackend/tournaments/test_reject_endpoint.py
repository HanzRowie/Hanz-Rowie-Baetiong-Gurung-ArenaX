"""
Tests for Admin Tournament Reject Action Endpoint
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from tournaments.models import Tournament, TournamentAuditLog


@pytest.mark.django_db
class TestAdminTournamentRejectAction:
    """Test suite for tournament reject action endpoint"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = CustomUser.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            full_name='Admin User',
            role='ADMIN',
            approval_status='APPROVED'
        )
        
        # Create organizer user
        self.organizer = CustomUser.objects.create_user(
            username='organizer',
            email='organizer@test.com',
            password='testpass123',
            full_name='Organizer User',
            role='ORGANIZER',
            approval_status='APPROVED'
        )
    
    def test_reject_pending_tournament(self):
        """Test rejecting a tournament with PENDING status"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Venue not verified'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'REJECTED'
        assert str(response.data['approved_by']) == str(self.admin.id)
        assert response.data['rejection_reason'] == 'Venue not verified'
        assert response.data['approval_date'] is not None
        
        # Verify database was updated
        tournament.refresh_from_db()
        assert tournament.approval_status == 'REJECTED'
        assert tournament.approved_by == self.admin
        assert tournament.rejection_reason == 'Venue not verified'
        assert tournament.approval_date is not None
    
    def test_reject_conditional_approval_tournament(self):
        """Test rejecting a tournament with CONDITIONAL_APPROVAL status"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='CONDITIONAL_APPROVAL'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Documents not provided'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'REJECTED'
        
        # Verify database was updated
        tournament.refresh_from_db()
        assert tournament.approval_status == 'REJECTED'
    
    def test_reject_without_reason_fails(self):
        """Test that rejecting without rejection_reason fails"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'rejection_reason is required' in response.data['error']
    
    def test_reject_with_empty_reason_fails(self):
        """Test that rejecting with empty rejection_reason fails"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {'rejection_reason': '   '})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'rejection_reason is required' in response.data['error']
    
    def test_cannot_reject_already_approved_tournament(self):
        """Test that already approved tournaments cannot be rejected"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='APPROVED',
            approved_by=self.admin,
            approval_date=timezone.now()
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Changed my mind'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'Cannot reject tournament with status APPROVED' in response.data['error']
    
    def test_cannot_reject_already_rejected_tournament(self):
        """Test that already rejected tournaments cannot be rejected again"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='REJECTED',
            approved_by=self.admin,
            approval_date=timezone.now(),
            rejection_reason='Invalid venue'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Another reason'
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'Cannot reject tournament with status REJECTED' in response.data['error']
    
    def test_reject_creates_audit_log(self):
        """Test that rejecting a tournament creates an audit log entry"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Test rejection reason'
        })
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify audit log was created
        audit_logs = TournamentAuditLog.objects.filter(tournament=tournament)
        assert audit_logs.count() == 1
        
        audit_log = audit_logs.first()
        assert audit_log.administrator == self.admin
        assert audit_log.action_type == 'REJECT'
        assert audit_log.previous_status == 'PENDING'
        assert audit_log.new_status == 'REJECTED'
        assert audit_log.reason == 'Test rejection reason'
        assert 'ip_address' in audit_log.metadata
        assert 'user_agent' in audit_log.metadata
    
    def test_reject_unauthorized_non_admin(self):
        """Test that non-admin users cannot reject tournaments"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Should not work'
        })
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_reject_unauthenticated(self):
        """Test that unauthenticated users cannot reject tournaments"""
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        url = reverse('admin-tournament-reject', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'rejection_reason': 'Should not work'
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
