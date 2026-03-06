"""
Tests for TournamentAuditLog model
"""
from django.test import TestCase
from django.utils import timezone
from accounts.models import CustomUser
from tournaments.models import Tournament, TournamentAuditLog
import uuid


class TournamentAuditLogModelTest(TestCase):
    """Test TournamentAuditLog model implementation"""
    
    def setUp(self):
        """Set up test data"""
        # Create admin user
        self.admin = CustomUser.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='testpass123',
            full_name='Test Admin',
            role='ADMIN'
        )
        
        # Create organizer user
        self.organizer = CustomUser.objects.create_user(
            username='organizer',
            email='organizer@test.com',
            password='testpass123',
            full_name='Test Organizer',
            role='ORGANIZER'
        )
        
        # Create tournament
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=100.00,
            max_participants=16,
            registration_deadline=timezone.now() + timezone.timedelta(days=7),
            approval_status='PENDING'
        )
    
    def test_audit_log_creation(self):
        """Test creating an audit log entry"""
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED',
            reason='All requirements met',
            metadata={'ip_address': '127.0.0.1', 'user_agent': 'Test Browser'}
        )
        
        self.assertIsNotNone(audit_log.id)
        self.assertIsInstance(audit_log.id, uuid.UUID)
        self.assertEqual(audit_log.administrator, self.admin)
        self.assertEqual(audit_log.action_type, 'APPROVE')
        self.assertEqual(audit_log.tournament, self.tournament)
        self.assertEqual(audit_log.previous_status, 'PENDING')
        self.assertEqual(audit_log.new_status, 'APPROVED')
        self.assertEqual(audit_log.reason, 'All requirements met')
        self.assertIsNotNone(audit_log.timestamp)
    
    def test_audit_log_str_method(self):
        """Test __str__ method returns correct format"""
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='REJECT',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='REJECTED',
            reason='Incomplete documentation'
        )
        
        expected_str = f"{self.admin.full_name} - REJECT - {audit_log.timestamp}"
        self.assertEqual(str(audit_log), expected_str)
    
    def test_audit_log_bulk_operation(self):
        """Test audit log for bulk operations"""
        tournament_ids = [str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())]
        
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='BULK_APPROVE',
            tournament_ids=tournament_ids,
            previous_status='PENDING',
            new_status='APPROVED',
            reason='Bulk approval of verified tournaments'
        )
        
        self.assertEqual(audit_log.action_type, 'BULK_APPROVE')
        self.assertEqual(len(audit_log.tournament_ids), 3)
        self.assertIsNone(audit_log.tournament)
    
    def test_audit_log_metadata_storage(self):
        """Test metadata JSON field stores additional context"""
        metadata = {
            'ip_address': '192.168.1.1',
            'user_agent': 'Mozilla/5.0',
            'validation_results': {
                'venue_check': 'passed',
                'document_check': 'passed',
                'date_check': 'passed'
            }
        }
        
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED',
            metadata=metadata
        )
        
        self.assertEqual(audit_log.metadata['ip_address'], '192.168.1.1')
        self.assertEqual(audit_log.metadata['validation_results']['venue_check'], 'passed')
    
    def test_audit_log_ordering(self):
        """Test audit logs are ordered by timestamp descending"""
        # Create multiple audit logs
        log1 = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='VIEW_DOCUMENT',
            tournament=self.tournament
        )
        
        log2 = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED'
        )
        
        logs = TournamentAuditLog.objects.all()
        self.assertEqual(logs[0], log2)  # Most recent first
        self.assertEqual(logs[1], log1)
    
    def test_audit_log_indexes(self):
        """Test that required indexes are created"""
        indexes = [idx.name for idx in TournamentAuditLog._meta.indexes]
        
        # We should have 3 indexes as defined in the model
        self.assertEqual(len(indexes), 3)
        
        # Check that indexes exist (names are auto-generated by Django)
        # Just verify we have the expected number of indexes
        self.assertGreater(len(indexes), 0)
    
    def test_audit_log_action_choices(self):
        """Test all required action types are available"""
        action_types = [choice[0] for choice in TournamentAuditLog.ACTION_CHOICES]
        
        required_actions = [
            'APPROVE',
            'REJECT',
            'CONDITIONAL_APPROVE',
            'BULK_APPROVE',
            'BULK_REJECT',
            'VIEW_DOCUMENT',
            'REQUEST_DOCUMENTS'
        ]
        
        for action in required_actions:
            self.assertIn(action, action_types)
    
    def test_audit_log_protect_on_delete(self):
        """Test that audit logs are protected when related objects are deleted"""
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED'
        )
        
        # Attempting to delete the tournament should raise an error
        # because of PROTECT on_delete
        from django.db.models import ProtectedError
        
        with self.assertRaises(ProtectedError):
            self.tournament.delete()
        
        # Audit log should still exist
        self.assertTrue(TournamentAuditLog.objects.filter(id=audit_log.id).exists())
    
    def test_audit_log_related_name(self):
        """Test related name for accessing audit logs from tournament"""
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED'
        )
        
        # Access audit logs through tournament's related name
        tournament_logs = self.tournament.audit_logs.all()
        self.assertEqual(tournament_logs.count(), 1)
        self.assertEqual(tournament_logs.first(), audit_log)
    
    def test_audit_log_admin_related_name(self):
        """Test related name for accessing audit logs from administrator"""
        audit_log = TournamentAuditLog.objects.create(
            administrator=self.admin,
            action_type='APPROVE',
            tournament=self.tournament,
            previous_status='PENDING',
            new_status='APPROVED'
        )
        
        # Access audit logs through admin's related name
        admin_actions = self.admin.tournament_admin_actions.all()
        self.assertEqual(admin_actions.count(), 1)
        self.assertEqual(admin_actions.first(), audit_log)
