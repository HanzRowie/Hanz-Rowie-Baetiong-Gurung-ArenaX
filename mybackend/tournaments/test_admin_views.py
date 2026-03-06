"""
Tests for Admin Tournament Management API
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from tournaments.models import Tournament
from venues.models import Venue


@pytest.mark.django_db
class TestAdminTournamentViewSet:
    """Test suite for AdminTournamentViewSet"""
    
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
        
        # Create test tournaments
        self.tournament_pending = Tournament.objects.create(
            organizer=self.organizer,
            title='Pending Tournament',
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
        
        self.tournament_approved = Tournament.objects.create(
            organizer=self.organizer,
            title='Approved Tournament',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            date=timezone.now().date() + timedelta(days=40),
            start_time='14:00:00',
            venue='Test Venue 2',
            entry_fee=50.00,
            max_participants=32,
            min_participants=8,
            registration_deadline=timezone.now() + timedelta(days=30),
            approval_status='APPROVED',
            approved_by=self.admin,
            approval_date=timezone.now()
        )
    
    def test_list_tournaments_as_admin(self):
        """Test that admin can list all tournaments"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 2
    
    def test_list_tournaments_filter_by_status(self):
        """Test filtering tournaments by approval status"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url, {'status': 'PENDING'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Pending Tournament'
    
    def test_list_tournaments_filter_by_sport_type(self):
        """Test filtering tournaments by sport type"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url, {'sport_type': 'FUTSAL'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['sport_type'] == 'FUTSAL'
    
    def test_list_tournaments_search(self):
        """Test searching tournaments by title"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url, {'search': 'Pending'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert 'Pending' in response.data['results'][0]['title']
    
    def test_retrieve_tournament_detail(self):
        """Test retrieving tournament detail"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-detail', kwargs={'pk': self.tournament_pending.id})
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == str(self.tournament_pending.id)
        assert response.data['title'] == 'Pending Tournament'
        assert response.data['approval_status'] == 'PENDING'
        assert 'organizer_details' in response.data
        assert 'audit_logs' in response.data
    
    def test_list_tournaments_unauthorized(self):
        """Test that non-admin users cannot access admin endpoints"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_list_tournaments_unauthenticated(self):
        """Test that unauthenticated users cannot access admin endpoints"""
        url = reverse('admin-tournament-list')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_pagination(self):
        """Test pagination works correctly"""
        # Create more tournaments
        for i in range(30):
            Tournament.objects.create(
                organizer=self.organizer,
                title=f'Tournament {i}',
                sport_type='FUTSAL',
                tournament_type='knockout',
                registration_type='TEAM',
                date=timezone.now().date() + timedelta(days=30 + i),
                start_time='10:00:00',
                venue=f'Venue {i}',
                entry_fee=100.00,
                max_participants=16,
                min_participants=4,
                registration_deadline=timezone.now() + timedelta(days=20 + i),
                approval_status='PENDING'
            )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-list')
        
        # Test default page size (25)
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 25
        assert response.data['count'] == 32  # 2 initial + 30 new
        
        # Test custom page size
        response = self.client.get(url, {'page_size': 50})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 32


@pytest.mark.django_db
class TestAdminTournamentApproveAction:
    """Test suite for tournament approve action endpoint"""
    
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
    
    def test_approve_pending_tournament(self):
        """Test approving a tournament with PENDING status"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'approval_notes': 'Looks good, approved!'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'APPROVED'
        assert str(response.data['approved_by']) == str(self.admin.id)
        assert response.data['approval_notes'] == 'Looks good, approved!'
        assert response.data['approval_date'] is not None
        
        # Verify database was updated
        tournament.refresh_from_db()
        assert tournament.approval_status == 'APPROVED'
        assert tournament.approved_by == self.admin
        assert tournament.approval_notes == 'Looks good, approved!'
        assert tournament.approval_date is not None
    
    def test_approve_conditional_approval_tournament(self):
        """Test approving a tournament with CONDITIONAL_APPROVAL status"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'APPROVED'
        
        # Verify database was updated
        tournament.refresh_from_db()
        assert tournament.approval_status == 'APPROVED'
    
    def test_approve_without_notes(self):
        """Test approving a tournament without approval notes"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'APPROVED'
        assert response.data['approval_notes'] == ''
    
    def test_cannot_approve_already_approved_tournament(self):
        """Test that already approved tournaments cannot be approved again"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'Cannot approve tournament with status APPROVED' in response.data['error']
    
    def test_cannot_approve_rejected_tournament(self):
        """Test that rejected tournaments cannot be approved"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'Cannot approve tournament with status REJECTED' in response.data['error']
    
    def test_approve_creates_audit_log(self):
        """Test that approving a tournament creates an audit log entry"""
        from tournaments.models import TournamentAuditLog
        
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url, {
            'approval_notes': 'Test approval'
        })
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify audit log was created
        audit_logs = TournamentAuditLog.objects.filter(tournament=tournament)
        assert audit_logs.count() == 1
        
        audit_log = audit_logs.first()
        assert audit_log.administrator == self.admin
        assert audit_log.action_type == 'APPROVE'
        assert audit_log.previous_status == 'PENDING'
        assert audit_log.new_status == 'APPROVED'
        assert audit_log.reason == 'Test approval'
        assert 'ip_address' in audit_log.metadata
        assert 'user_agent' in audit_log.metadata
    
    def test_approve_unauthorized_non_admin(self):
        """Test that non-admin users cannot approve tournaments"""
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
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_approve_unauthenticated(self):
        """Test that unauthenticated users cannot approve tournaments"""
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
        
        url = reverse('admin-tournament-approve', kwargs={'pk': tournament.id})
        
        response = self.client.patch(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED



@pytest.mark.django_db
class TestAdminTournamentStatsAction:
    """Test suite for tournament stats endpoint"""
    
    def setup_method(self):
        """Set up test data"""
        from django.core.cache import cache
        
        # Clear cache before each test
        cache.clear()
        
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
    
    def test_stats_endpoint_returns_correct_counts(self):
        """Test that stats endpoint returns correct overall counts"""
        # Create tournaments with different statuses
        Tournament.objects.create(
            organizer=self.organizer,
            title='Pending Tournament 1',
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
        
        Tournament.objects.create(
            organizer=self.organizer,
            title='Pending Tournament 2',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            date=timezone.now().date() + timedelta(days=35),
            start_time='14:00:00',
            venue='Test Venue 2',
            entry_fee=50.00,
            max_participants=32,
            min_participants=8,
            registration_deadline=timezone.now() + timedelta(days=25),
            approval_status='PENDING'
        )
        
        Tournament.objects.create(
            organizer=self.organizer,
            title='Approved Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=40),
            start_time='10:00:00',
            venue='Test Venue 3',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=30),
            approval_status='APPROVED',
            approved_by=self.admin,
            approval_date=timezone.now()
        )
        
        Tournament.objects.create(
            organizer=self.organizer,
            title='Rejected Tournament',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            date=timezone.now().date() + timedelta(days=45),
            start_time='14:00:00',
            venue='Test Venue 4',
            entry_fee=50.00,
            max_participants=32,
            min_participants=8,
            registration_deadline=timezone.now() + timedelta(days=35),
            approval_status='REJECTED',
            approved_by=self.admin,
            approval_date=timezone.now(),
            rejection_reason='Invalid venue'
        )
        
        Tournament.objects.create(
            organizer=self.organizer,
            title='Conditional Approval Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=50),
            start_time='10:00:00',
            venue='Test Venue 5',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=40),
            approval_status='CONDITIONAL_APPROVAL'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-stats')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_pending'] == 2
        assert response.data['total_approved'] == 1
        assert response.data['total_rejected'] == 1
        assert response.data['total_conditional_approval'] == 1
    
    def test_stats_endpoint_returns_correct_breakdown_by_sport_type(self):
        """Test that stats endpoint returns correct breakdown by sport_type"""
        # Create FUTSAL tournaments
        Tournament.objects.create(
            organizer=self.organizer,
            title='FUTSAL Pending',
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
        
        Tournament.objects.create(
            organizer=self.organizer,
            title='FUTSAL Approved',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=35),
            start_time='10:00:00',
            venue='Test Venue 2',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=25),
            approval_status='APPROVED',
            approved_by=self.admin,
            approval_date=timezone.now()
        )
        
        # Create BADMINTON tournaments
        Tournament.objects.create(
            organizer=self.organizer,
            title='BADMINTON Rejected',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            date=timezone.now().date() + timedelta(days=40),
            start_time='14:00:00',
            venue='Test Venue 3',
            entry_fee=50.00,
            max_participants=32,
            min_participants=8,
            registration_deadline=timezone.now() + timedelta(days=30),
            approval_status='REJECTED',
            approved_by=self.admin,
            approval_date=timezone.now(),
            rejection_reason='Invalid'
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-stats')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'by_sport_type' in response.data
        
        # Check FUTSAL stats
        assert response.data['by_sport_type']['FUTSAL']['pending'] == 1
        assert response.data['by_sport_type']['FUTSAL']['approved'] == 1
        assert response.data['by_sport_type']['FUTSAL']['rejected'] == 0
        assert response.data['by_sport_type']['FUTSAL']['conditional_approval'] == 0
        
        # Check BADMINTON stats
        assert response.data['by_sport_type']['BADMINTON']['pending'] == 0
        assert response.data['by_sport_type']['BADMINTON']['approved'] == 0
        assert response.data['by_sport_type']['BADMINTON']['rejected'] == 1
        assert response.data['by_sport_type']['BADMINTON']['conditional_approval'] == 0
    
    def test_stats_endpoint_with_no_tournaments(self):
        """Test that stats endpoint returns zeros when no tournaments exist"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-stats')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_pending'] == 0
        assert response.data['total_approved'] == 0
        assert response.data['total_rejected'] == 0
        assert response.data['total_conditional_approval'] == 0
        assert 'by_sport_type' in response.data
        assert response.data['by_sport_type']['FUTSAL']['pending'] == 0
        assert response.data['by_sport_type']['BADMINTON']['pending'] == 0
    
    def test_stats_endpoint_caching(self):
        """Test that stats endpoint uses caching"""
        from django.core.cache import cache
        
        # Clear cache first
        cache.clear()
        
        # Create a tournament
        Tournament.objects.create(
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
        url = reverse('admin-tournament-stats')
        
        # First request - should hit database
        response1 = self.client.get(url)
        assert response1.status_code == status.HTTP_200_OK
        assert response1.data['total_pending'] == 1
        
        # Create another tournament
        Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament 2',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=35),
            start_time='10:00:00',
            venue='Test Venue 2',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=25),
            approval_status='PENDING'
        )
        
        # Second request - should return cached data (still showing 1)
        response2 = self.client.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data['total_pending'] == 1  # Cached value
        
        # Clear cache and request again - should show updated count
        cache.clear()
        response3 = self.client.get(url)
        assert response3.status_code == status.HTTP_200_OK
        assert response3.data['total_pending'] == 2  # Fresh data
    
    def test_stats_endpoint_unauthorized_non_admin(self):
        """Test that non-admin users cannot access stats endpoint"""
        self.client.force_authenticate(user=self.organizer)
        url = reverse('admin-tournament-stats')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_stats_endpoint_unauthenticated(self):
        """Test that unauthenticated users cannot access stats endpoint"""
        url = reverse('admin-tournament-stats')
        
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestAdminTournamentBulkOperations:
    """Test suite for bulk approve and reject operations"""
    
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
    
    def test_bulk_approve_success(self):
        """Test bulk approving multiple tournaments"""
        # Create 3 pending tournaments
        tournaments = []
        for i in range(3):
            tournament = Tournament.objects.create(
                organizer=self.organizer,
                title=f'Tournament {i+1}',
                sport_type='FUTSAL',
                tournament_type='knockout',
                registration_type='TEAM',
                date=timezone.now().date() + timedelta(days=30+i),
                start_time='10:00:00',
                venue=f'Venue {i+1}',
                entry_fee=100.00,
                max_participants=16,
                min_participants=4,
                registration_deadline=timezone.now() + timedelta(days=20+i),
                approval_status='PENDING'
            )
            tournaments.append(tournament)
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-approve')
        
        data = {
            'tournament_ids': [t.id for t in tournaments],
            'approval_notes': 'Bulk approval test'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 3
        assert response.data['failure_count'] == 0
        assert response.data['total_count'] == 3
        assert len(response.data['approved_tournament_ids']) == 3
        
        # Verify all tournaments are approved
        for tournament in tournaments:
            tournament.refresh_from_db()
            assert tournament.approval_status == 'APPROVED'
            assert tournament.approved_by == self.admin
            assert tournament.approval_notes == 'Bulk approval test'
    
    def test_bulk_approve_max_limit(self):
        """Test that bulk approve enforces 50 item limit"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-approve')
        
        # Try to approve 51 tournaments
        data = {
            'tournament_ids': list(range(1, 52))
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Cannot approve more than 50 tournaments' in response.data['error']
    
    def test_bulk_approve_empty_array(self):
        """Test that bulk approve rejects empty array"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-approve')
        
        data = {
            'tournament_ids': []
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'cannot be empty' in response.data['error']
    
    def test_bulk_approve_partial_failure(self):
        """Test bulk approve with some failures"""
        # Create 2 pending and 1 already approved tournament
        pending1 = Tournament.objects.create(
            organizer=self.organizer,
            title='Pending 1',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00:00',
            venue='Venue 1',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=20),
            approval_status='PENDING'
        )
        
        pending2 = Tournament.objects.create(
            organizer=self.organizer,
            title='Pending 2',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=31),
            start_time='10:00:00',
            venue='Venue 2',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=21),
            approval_status='PENDING'
        )
        
        approved = Tournament.objects.create(
            organizer=self.organizer,
            title='Already Approved',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=32),
            start_time='10:00:00',
            venue='Venue 3',
            entry_fee=100.00,
            max_participants=16,
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=22),
            approval_status='APPROVED',
            approved_by=self.admin,
            approval_date=timezone.now()
        )
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-approve')
        
        data = {
            'tournament_ids': [pending1.id, pending2.id, approved.id, 99999]
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 2
        assert response.data['failure_count'] == 2
        assert response.data['total_count'] == 4
        assert len(response.data['failures']) == 2
        
        # Check failure details
        failure_ids = [f['tournament_id'] for f in response.data['failures']]
        assert str(approved.id) in [str(fid) for fid in failure_ids]
        assert 99999 in failure_ids
    
    def test_bulk_approve_creates_audit_logs(self):
        """Test that bulk approve creates audit log entries"""
        from tournaments.models import TournamentAuditLog
        
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
        url = reverse('admin-tournament-bulk-approve')
        
        data = {
            'tournament_ids': [tournament.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check audit log was created
        audit_log = TournamentAuditLog.objects.filter(
            tournament=tournament,
            action_type='BULK_APPROVE'
        ).first()
        
        assert audit_log is not None
        assert audit_log.administrator == self.admin
        assert audit_log.previous_status == 'PENDING'
        assert audit_log.new_status == 'APPROVED'
        assert audit_log.metadata['bulk_operation'] is True
    
    def test_bulk_reject_success(self):
        """Test bulk rejecting multiple tournaments"""
        # Create 3 pending tournaments
        tournaments = []
        for i in range(3):
            tournament = Tournament.objects.create(
                organizer=self.organizer,
                title=f'Tournament {i+1}',
                sport_type='FUTSAL',
                tournament_type='knockout',
                registration_type='TEAM',
                date=timezone.now().date() + timedelta(days=30+i),
                start_time='10:00:00',
                venue=f'Venue {i+1}',
                entry_fee=100.00,
                max_participants=16,
                min_participants=4,
                registration_deadline=timezone.now() + timedelta(days=20+i),
                approval_status='PENDING'
            )
            tournaments.append(tournament)
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-reject')
        
        data = {
            'tournament_ids': [t.id for t in tournaments],
            'rejection_reason': 'Bulk rejection test'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 3
        assert response.data['failure_count'] == 0
        assert response.data['total_count'] == 3
        assert len(response.data['rejected_tournament_ids']) == 3
        
        # Verify all tournaments are rejected
        for tournament in tournaments:
            tournament.refresh_from_db()
            assert tournament.approval_status == 'REJECTED'
            assert tournament.approved_by == self.admin
            assert tournament.rejection_reason == 'Bulk rejection test'
    
    def test_bulk_reject_requires_reason(self):
        """Test that bulk reject requires rejection_reason"""
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
        url = reverse('admin-tournament-bulk-reject')
        
        data = {
            'tournament_ids': [tournament.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'rejection_reason is required' in response.data['error']
    
    def test_bulk_reject_max_limit(self):
        """Test that bulk reject enforces 50 item limit"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-tournament-bulk-reject')
        
        # Try to reject 51 tournaments
        data = {
            'tournament_ids': list(range(1, 52)),
            'rejection_reason': 'Test reason'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Cannot reject more than 50 tournaments' in response.data['error']
    
    def test_bulk_operations_unauthorized(self):
        """Test that non-admin users cannot perform bulk operations"""
        self.client.force_authenticate(user=self.organizer)
        
        # Test bulk approve
        url = reverse('admin-tournament-bulk-approve')
        response = self.client.post(url, {'tournament_ids': [1]}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Test bulk reject
        url = reverse('admin-tournament-bulk-reject')
        response = self.client.post(url, {
            'tournament_ids': [1],
            'rejection_reason': 'Test'
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
