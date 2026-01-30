"""
Basic tests for team management API endpoints.
These tests verify that the endpoints are properly configured and can handle basic requests.
"""

from django.test import TestCase
from django.urls import reverse, resolve
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class TeamEndpointsTestCase(TestCase):
    """Test case for team management API endpoints"""
    
    def test_url_patterns_resolve_correctly(self):
        """Test that all URL patterns resolve to the correct views"""
        # Team CRUD endpoints
        self.assertEqual(resolve('/api/teams/teams/create/').view_name, 'teams:create_team')
        self.assertEqual(resolve('/api/teams/teams/').view_name, 'teams:list_teams')
        
        # Use a sample UUID for testing
        sample_uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        self.assertEqual(resolve(f'/api/teams/teams/{sample_uuid}/').view_name, 'teams:get_team')
        self.assertEqual(resolve(f'/api/teams/teams/{sample_uuid}/update/').view_name, 'teams:update_team')
        self.assertEqual(resolve(f'/api/teams/teams/{sample_uuid}/delete/').view_name, 'teams:delete_team')
        
        # Team membership endpoints
        self.assertEqual(resolve(f'/api/teams/teams/{sample_uuid}/members/').view_name, 'teams:get_team_members')
        self.assertEqual(resolve(f'/api/teams/teams/{sample_uuid}/members/add/').view_name, 'teams:add_team_member')
        
        # Invitation endpoints
        self.assertEqual(resolve('/api/teams/invitations/').view_name, 'teams:list_player_invitations')
        self.assertEqual(resolve(f'/api/teams/invitations/{sample_uuid}/').view_name, 'teams:get_invitation_details')
    
    def test_serializers_import_correctly(self):
        """Test that all serializers can be imported"""
        from teams.serializers import (
            TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer,
            TeamMembershipSerializer, InvitationSerializer, TeamListSerializer
        )
        
        # Test that serializers have the expected fields
        team_serializer = TeamSerializer()
        self.assertIn('name', team_serializer.fields)
        self.assertIn('sport_types', team_serializer.fields)
        self.assertIn('owner', team_serializer.fields)
        
        create_serializer = TeamCreateSerializer()
        self.assertIn('name', create_serializer.fields)
        self.assertIn('sport_types', create_serializer.fields)
    
    def test_services_import_correctly(self):
        """Test that all services can be imported"""
        from teams.services import TeamManager, RoleManager, InvitationManager
        
        # Test that services have the expected methods
        self.assertTrue(hasattr(TeamManager, 'create_team'))
        self.assertTrue(hasattr(TeamManager, 'update_team'))
        self.assertTrue(hasattr(TeamManager, 'delete_team'))
        
        self.assertTrue(hasattr(RoleManager, 'assign_role'))
        self.assertTrue(hasattr(RoleManager, 'transfer_ownership'))
        
        self.assertTrue(hasattr(InvitationManager, 'send_invitation'))
        self.assertTrue(hasattr(InvitationManager, 'respond_to_invitation'))
    
    def test_models_import_correctly(self):
        """Test that all models can be imported and have expected fields"""
        from teams.models import Team, TeamMembership, Invitation, ActivityHistory
        
        # Test Team model
        team_fields = [field.name for field in Team._meta.fields]
        self.assertIn('name', team_fields)
        self.assertIn('sport_types', team_fields)
        self.assertIn('owner', team_fields)
        self.assertIn('max_size', team_fields)
        
        # Test TeamMembership model
        membership_fields = [field.name for field in TeamMembership._meta.fields]
        self.assertIn('team', membership_fields)
        self.assertIn('player', membership_fields)
        self.assertIn('role', membership_fields)
        
        # Test Invitation model
        invitation_fields = [field.name for field in Invitation._meta.fields]
        self.assertIn('team', invitation_fields)
        self.assertIn('player', invitation_fields)
        self.assertIn('sender', invitation_fields)
        self.assertIn('status', invitation_fields)
    
    def test_url_patterns_are_unique(self):
        """Test that all URL patterns are unique and properly configured"""
        from teams.urls import urlpatterns
        
        # Check that we have the expected number of URL patterns
        self.assertGreaterEqual(len(urlpatterns), 15)
        
        # Check that all patterns have names
        pattern_names = []
        for pattern in urlpatterns:
            self.assertIsNotNone(pattern.name)
            pattern_names.append(pattern.name)
        
        # Check that all names are unique
        self.assertEqual(len(pattern_names), len(set(pattern_names)))
    
    def test_view_functions_exist(self):
        """Test that all view functions exist and are callable"""
        from teams import views
        
        # Test that all expected view functions exist
        expected_views = [
            'create_team', 'list_teams', 'get_team', 'update_team', 'delete_team',
            'add_team_member', 'remove_team_member', 'update_member_role',
            'transfer_ownership', 'get_team_members', 'get_member_details',
            'send_invitation', 'list_team_invitations', 'list_player_invitations',
            'respond_to_invitation', 'cancel_invitation', 'get_invitation_details'
        ]
        
        for view_name in expected_views:
            self.assertTrue(hasattr(views, view_name), f"View {view_name} not found")
            self.assertTrue(callable(getattr(views, view_name)), f"View {view_name} is not callable")


if __name__ == '__main__':
    import django
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
    django.setup()
    
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["teams.test_endpoints"])
    
    if failures:
        exit(1)