"""
Tests for Admin Venue Management API
Tests all endpoints in AdminVenueViewSet including approval workflow.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import time

from accounts.models import CustomUser
from venues.models import Venue, VenueAuditLog


@pytest.fixture
def api_client():
    """Create API client for testing."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    return CustomUser.objects.create_user(
        username='admin',
        email='admin@test.com',
        password='testpass123',
        full_name='Admin User',
        role='ADMIN',
        approval_status='APPROVED'
    )


@pytest.fixture
def venue_owner(db):
    """Create a venue owner for testing."""
    return CustomUser.objects.create_user(
        username='venueowner',
        email='owner@test.com',
        password='testpass123',
        full_name='Venue Owner',
        role='VENUE_OWNER',
        approval_status='APPROVED'
    )


@pytest.fixture
def pending_venue(db, venue_owner):
    """Create a pending venue for testing."""
    return Venue.objects.create(
        owner=venue_owner,
        name='Test Futsal Arena',
        location='123 Test Street, Test City',
        sport_type='FUTSAL',
        capacity=20,
        price_per_hour=1500.00,
        approval_status='PENDING',
        operating_days=[1, 2, 3, 4, 5, 6, 7],
        default_opening_time=time(6, 0),
        default_closing_time=time(22, 0)
    )


@pytest.fixture
def approved_venue(db, venue_owner, admin_user):
    """Create an approved venue for testing."""
    return Venue.objects.create(
        owner=venue_owner,
        name='Approved Badminton Court',
        location='456 Approved Ave, Test City',
        sport_type='BADMINTON',
        capacity=10,
        price_per_hour=1200.00,
        approval_status='APPROVED',
        approved_by=admin_user,
        approval_date=timezone.now(),
        operating_days=[1, 2, 3, 4, 5],
        default_opening_time=time(7, 0),
        default_closing_time=time(21, 0)
    )


@pytest.mark.django_db
class TestAdminVenueViewSetList:
    """Tests for venue list endpoint."""
    
    def test_list_venues_requires_admin(self, api_client, venue_owner, pending_venue):
        """Test that non-admin users cannot access venue list."""
        api_client.force_authenticate(user=venue_owner)
        url = reverse('admin-venue-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_list_venues_as_admin(self, api_client, admin_user, pending_venue, approved_venue):
        """Test that admin can list all venues."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) == 2
    
    def test_filter_by_sport_type(self, api_client, admin_user, pending_venue, approved_venue):
        """Test filtering venues by sport type."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-list')
        response = api_client.get(url, {'sport_type': 'FUTSAL'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['sport_type'] == 'FUTSAL'
    
    def test_filter_by_status(self, api_client, admin_user, pending_venue, approved_venue):
        """Test filtering venues by approval status."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-list')
        response = api_client.get(url, {'status': 'PENDING'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['approval_status'] == 'PENDING'
    
    def test_filter_by_owner(self, api_client, admin_user, venue_owner, pending_venue, approved_venue):
        """Test filtering venues by owner."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-list')
        response = api_client.get(url, {'owner': venue_owner.id})
        
        assert response.status_code == status.HTTP_200_OK
        # Both venues belong to the same owner
        assert len(response.data['results']) >= 1
    
    def test_search_venues(self, api_client, admin_user, pending_venue, approved_venue):
        """Test searching venues by name, owner, or location."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-list')
        
        # Search by name
        response = api_client.get(url, {'search': 'Futsal'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        
        # Search by location
        response = api_client.get(url, {'search': 'Approved Ave'})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestAdminVenueViewSetDetail:
    """Tests for venue detail endpoint."""
    
    def test_get_venue_detail_requires_admin(self, api_client, venue_owner, pending_venue):
        """Test that non-admin users cannot access venue detail."""
        api_client.force_authenticate(user=venue_owner)
        url = reverse('admin-venue-detail', kwargs={'pk': pending_venue.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_venue_detail_as_admin(self, api_client, admin_user, pending_venue):
        """Test that admin can view venue details."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-detail', kwargs={'pk': pending_venue.id})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == pending_venue.id
        assert response.data['name'] == pending_venue.name
        assert 'owner_details' in response.data
        assert 'audit_logs' in response.data


@pytest.mark.django_db
class TestAdminVenueApproval:
    """Tests for venue approval endpoint."""
    
    def test_approve_venue_requires_admin(self, api_client, venue_owner, pending_venue):
        """Test that non-admin users cannot approve venues."""
        api_client.force_authenticate(user=venue_owner)
        url = reverse('admin-venue-approve', kwargs={'pk': pending_venue.id})
        response = api_client.patch(url, {})
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_approve_pending_venue(self, api_client, admin_user, pending_venue):
        """Test approving a pending venue."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-approve', kwargs={'pk': pending_venue.id})
        
        response = api_client.patch(url, {
            'approval_notes': 'Venue meets all requirements'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'APPROVED'
        assert response.data['approved_by'] == admin_user.id
        assert response.data['approval_notes'] == 'Venue meets all requirements'
        
        # Verify venue was updated in database
        pending_venue.refresh_from_db()
        assert pending_venue.approval_status == 'APPROVED'
        assert pending_venue.approved_by == admin_user
        assert pending_venue.approval_date is not None
    
    def test_approve_venue_creates_audit_log(self, api_client, admin_user, pending_venue):
        """Test that approving a venue creates an audit log entry."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-approve', kwargs={'pk': pending_venue.id})
        
        response = api_client.patch(url, {})
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify audit log was created
        audit_logs = VenueAuditLog.objects.filter(venue=pending_venue)
        assert audit_logs.count() == 1
        
        log = audit_logs.first()
        assert log.administrator == admin_user
        assert log.action_type == 'APPROVE'
        assert log.previous_status == 'PENDING'
        assert log.new_status == 'APPROVED'
    
    def test_cannot_approve_already_approved_venue(self, api_client, admin_user, approved_venue):
        """Test that already approved venues cannot be approved again."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-approve', kwargs={'pk': approved_venue.id})
        
        response = api_client.patch(url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data


@pytest.mark.django_db
class TestAdminVenueRejection:
    """Tests for venue rejection endpoint."""
    
    def test_reject_venue_requires_admin(self, api_client, venue_owner, pending_venue):
        """Test that non-admin users cannot reject venues."""
        api_client.force_authenticate(user=venue_owner)
        url = reverse('admin-venue-reject', kwargs={'pk': pending_venue.id})
        response = api_client.patch(url, {'rejection_reason': 'Test reason'})
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_reject_venue_requires_reason(self, api_client, admin_user, pending_venue):
        """Test that rejection requires a reason."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-reject', kwargs={'pk': pending_venue.id})
        
        response = api_client.patch(url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_reject_pending_venue(self, api_client, admin_user, pending_venue):
        """Test rejecting a pending venue."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-reject', kwargs={'pk': pending_venue.id})
        
        response = api_client.patch(url, {
            'rejection_reason': 'Incomplete documentation'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['approval_status'] == 'REJECTED'
        assert response.data['approved_by'] == admin_user.id
        assert response.data['rejection_reason'] == 'Incomplete documentation'
        
        # Verify venue was updated in database
        pending_venue.refresh_from_db()
        assert pending_venue.approval_status == 'REJECTED'
        assert pending_venue.approved_by == admin_user
        assert pending_venue.rejection_reason == 'Incomplete documentation'
    
    def test_reject_venue_creates_audit_log(self, api_client, admin_user, pending_venue):
        """Test that rejecting a venue creates an audit log entry."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-reject', kwargs={'pk': pending_venue.id})
        
        response = api_client.patch(url, {
            'rejection_reason': 'Missing business license'
        })
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify audit log was created
        audit_logs = VenueAuditLog.objects.filter(venue=pending_venue)
        assert audit_logs.count() == 1
        
        log = audit_logs.first()
        assert log.administrator == admin_user
        assert log.action_type == 'REJECT'
        assert log.previous_status == 'PENDING'
        assert log.new_status == 'REJECTED'
        assert log.reason == 'Missing business license'


@pytest.mark.django_db
class TestAdminVenueStats:
    """Tests for venue statistics endpoint."""
    
    def test_stats_requires_admin(self, api_client, venue_owner):
        """Test that non-admin users cannot access stats."""
        api_client.force_authenticate(user=venue_owner)
        url = reverse('admin-venue-stats')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_venue_stats(self, api_client, admin_user, pending_venue, approved_venue):
        """Test getting venue statistics."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-stats')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'total_pending' in response.data
        assert 'total_approved' in response.data
        assert 'total_rejected' in response.data
        assert 'total_conditional_approval' in response.data
        assert 'by_sport_type' in response.data
        
        assert response.data['total_pending'] == 1
        assert response.data['total_approved'] == 1
        assert response.data['total_rejected'] == 0
    
    def test_stats_by_sport_type(self, api_client, admin_user, pending_venue, approved_venue):
        """Test statistics breakdown by sport type."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-stats')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'FUTSAL' in response.data['by_sport_type']
        assert 'BADMINTON' in response.data['by_sport_type']
        
        futsal_stats = response.data['by_sport_type']['FUTSAL']
        assert futsal_stats['pending'] == 1
        assert futsal_stats['approved'] == 0
        
        badminton_stats = response.data['by_sport_type']['BADMINTON']
        assert badminton_stats['pending'] == 0
        assert badminton_stats['approved'] == 1


@pytest.mark.django_db
class TestAdminVenueBulkOperations:
    """Test suite for bulk approve and reject operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_user, venue_owner):
        """Set up test data"""
        self.admin = admin_user
        self.venue_owner = venue_owner
    
    def test_bulk_approve_success(self, api_client, admin_user, venue_owner):
        """Test bulk approving multiple venues"""
        # Create 3 pending venues
        venues = []
        for i in range(3):
            venue = Venue.objects.create(
                owner=venue_owner,
                name=f'Venue {i+1}',
                sport_type='FUTSAL',
                location=f'Location {i+1}',
                capacity=20,
                price_per_hour=1000.00,
                approval_status='PENDING',
                operating_days=[1, 2, 3, 4, 5, 6, 7]
            )
            venues.append(venue)
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-approve')
        
        data = {
            'venue_ids': [v.id for v in venues],
            'approval_notes': 'Bulk approval test'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 3
        assert response.data['failure_count'] == 0
        assert response.data['total_count'] == 3
        assert len(response.data['approved_venue_ids']) == 3
        
        # Verify all venues are approved
        for venue in venues:
            venue.refresh_from_db()
            assert venue.approval_status == 'APPROVED'
            assert venue.approved_by == admin_user
            assert venue.approval_notes == 'Bulk approval test'
    
    def test_bulk_approve_max_limit(self, api_client, admin_user):
        """Test that bulk approve enforces 50 item limit"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-approve')
        
        # Try to approve 51 venues
        data = {
            'venue_ids': list(range(1, 52))
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Cannot approve more than 50 venues' in response.data['error']
    
    def test_bulk_approve_empty_array(self, api_client, admin_user):
        """Test that bulk approve rejects empty array"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-approve')
        
        data = {
            'venue_ids': []
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'cannot be empty' in response.data['error']
    
    def test_bulk_approve_partial_failure(self, api_client, admin_user, venue_owner):
        """Test bulk approve with some failures"""
        # Create 2 pending and 1 already approved venue
        pending1 = Venue.objects.create(
            owner=venue_owner,
            name='Pending 1',
            sport_type='FUTSAL',
            location='Location 1',
            capacity=20,
            price_per_hour=1000.00,
            approval_status='PENDING',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        pending2 = Venue.objects.create(
            owner=venue_owner,
            name='Pending 2',
            sport_type='FUTSAL',
            location='Location 2',
            capacity=20,
            price_per_hour=1000.00,
            approval_status='PENDING',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        approved = Venue.objects.create(
            owner=venue_owner,
            name='Already Approved',
            sport_type='FUTSAL',
            location='Location 3',
            capacity=20,
            price_per_hour=1000.00,
            approval_status='APPROVED',
            approved_by=admin_user,
            approval_date=timezone.now(),
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-approve')
        
        data = {
            'venue_ids': [pending1.id, pending2.id, approved.id, 99999]
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 2
        assert response.data['failure_count'] == 2
        assert response.data['total_count'] == 4
        assert len(response.data['failures']) == 2
        
        # Check failure details
        failure_ids = [f['venue_id'] for f in response.data['failures']]
        assert approved.id in failure_ids
        assert 99999 in failure_ids
    
    def test_bulk_approve_creates_audit_logs(self, api_client, admin_user, venue_owner):
        """Test that bulk approve creates audit log entries"""
        from venues.models import VenueAuditLog
        
        venue = Venue.objects.create(
            owner=venue_owner,
            name='Test Venue',
            sport_type='FUTSAL',
            location='Test Location',
            capacity=20,
            price_per_hour=1000.00,
            approval_status='PENDING',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-approve')
        
        data = {
            'venue_ids': [venue.id]
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check audit log was created
        audit_log = VenueAuditLog.objects.filter(
            venue=venue,
            action_type='BULK_APPROVE'
        ).first()
        
        assert audit_log is not None
        assert audit_log.administrator == admin_user
        assert audit_log.previous_status == 'PENDING'
        assert audit_log.new_status == 'APPROVED'
        assert audit_log.metadata['bulk_operation'] is True
    
    def test_bulk_reject_success(self, api_client, admin_user, venue_owner):
        """Test bulk rejecting multiple venues"""
        # Create 3 pending venues
        venues = []
        for i in range(3):
            venue = Venue.objects.create(
                owner=venue_owner,
                name=f'Venue {i+1}',
                sport_type='FUTSAL',
                location=f'Location {i+1}',
                capacity=20,
                price_per_hour=1000.00,
                approval_status='PENDING',
                operating_days=[1, 2, 3, 4, 5, 6, 7]
            )
            venues.append(venue)
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-reject')
        
        data = {
            'venue_ids': [v.id for v in venues],
            'rejection_reason': 'Bulk rejection test'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success_count'] == 3
        assert response.data['failure_count'] == 0
        assert response.data['total_count'] == 3
        assert len(response.data['rejected_venue_ids']) == 3
        
        # Verify all venues are rejected
        for venue in venues:
            venue.refresh_from_db()
            assert venue.approval_status == 'REJECTED'
            assert venue.approved_by == admin_user
            assert venue.rejection_reason == 'Bulk rejection test'
    
    def test_bulk_reject_requires_reason(self, api_client, admin_user, venue_owner):
        """Test that bulk reject requires rejection_reason"""
        venue = Venue.objects.create(
            owner=venue_owner,
            name='Test Venue',
            sport_type='FUTSAL',
            location='Test Location',
            capacity=20,
            price_per_hour=1000.00,
            approval_status='PENDING',
            operating_days=[1, 2, 3, 4, 5, 6, 7]
        )
        
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-reject')
        
        data = {
            'venue_ids': [venue.id]
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'rejection_reason is required' in response.data['error']
    
    def test_bulk_reject_max_limit(self, api_client, admin_user):
        """Test that bulk reject enforces 50 item limit"""
        api_client.force_authenticate(user=admin_user)
        url = reverse('admin-venue-bulk-reject')
        
        # Try to reject 51 venues
        data = {
            'venue_ids': list(range(1, 52)),
            'rejection_reason': 'Test reason'
        }
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Cannot reject more than 50 venues' in response.data['error']
    
    def test_bulk_operations_unauthorized(self, api_client, venue_owner):
        """Test that non-admin users cannot perform bulk operations"""
        api_client.force_authenticate(user=venue_owner)
        
        # Test bulk approve
        url = reverse('admin-venue-bulk-approve')
        response = api_client.post(url, {'venue_ids': [1]}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Test bulk reject
        url = reverse('admin-venue-bulk-reject')
        response = api_client.post(url, {
            'venue_ids': [1],
            'rejection_reason': 'Test'
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
