from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from .models import Team, TeamMembership, ActivityHistory, Invitation
from .services.team_manager import TeamManager, DuplicateTeamNameError, TeamSizeLimitError
from .services.team_manager import InsufficientPermissionsError as TeamInsufficientPermissionsError
from .services.role_manager import RoleManager, InvalidRoleAssignmentError, OwnershipTransferError
from .services.invitation_manager import InvitationManager, InvitationAlreadyExistsError, InvitationExpiredError, TeamFullError
from .services.invitation_manager import InsufficientPermissionsError as InvitationInsufficientPermissionsError


class TeamManagerTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.owner = CustomUser.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='testpass123',
            full_name='Team Owner',
            role='PLAYER'
        )
        
        self.player = CustomUser.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Team Player',
            role='PLAYER'
        )

    def test_create_team_success(self):
        """Test successful team creation"""
        team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        self.assertEqual(team.name, 'Test Team')
        self.assertEqual(team.sport_types, ['FUTSAL'])
        self.assertEqual(team.owner, self.owner)
        self.assertTrue(team.is_active)
        
        # Check owner membership was created
        membership = TeamMembership.objects.get(team=team, player=self.owner)
        self.assertEqual(membership.role, 'OWNER')
        self.assertTrue(membership.is_active)
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.get(team=team, event_type='TEAM_CREATED')
        self.assertEqual(activity.performed_by, self.owner)

    def test_create_team_duplicate_name(self):
        """Test team creation with duplicate name fails"""
        TeamManager.create_team(
            name='Duplicate Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        with self.assertRaises(DuplicateTeamNameError):
            TeamManager.create_team(
                name='Duplicate Team',
                sport_types=['BADMINTON'],
                owner_id=str(self.player.id)
            )

    def test_create_team_invalid_owner(self):
        """Test team creation with invalid owner fails"""
        with self.assertRaises(ValidationError):
            TeamManager.create_team(
                name='Test Team',
                sport_types=['FUTSAL'],
                owner_id='invalid-uuid'
            )

    def test_update_team_success(self):
        """Test successful team update"""
        team = TeamManager.create_team(
            name='Original Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        updated_team = TeamManager.update_team(
            team_id=str(team.id),
            updates={'name': 'Updated Team', 'sport_types': ['FUTSAL', 'BADMINTON']},
            updated_by_id=str(self.owner.id)
        )
        
        self.assertEqual(updated_team.name, 'Updated Team')
        self.assertEqual(updated_team.sport_types, ['FUTSAL', 'BADMINTON'])

    def test_update_team_insufficient_permissions(self):
        """Test team update with insufficient permissions fails"""
        team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        with self.assertRaises(TeamInsufficientPermissionsError):
            TeamManager.update_team(
                team_id=str(team.id),
                updates={'name': 'Hacked Team'},
                updated_by_id=str(self.player.id)
            )

    def test_delete_team_success(self):
        """Test successful team deletion"""
        team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        result = TeamManager.delete_team(
            team_id=str(team.id),
            deleted_by_id=str(self.owner.id)
        )
        
        self.assertTrue(result)
        
        # Check team is deactivated
        team.refresh_from_db()
        self.assertFalse(team.is_active)
        
        # Check membership is deactivated
        membership = TeamMembership.objects.get(team=team, player=self.owner)
        self.assertFalse(membership.is_active)

    def test_add_member_success(self):
        """Test successful member addition"""
        team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        membership = TeamManager.add_member(
            team_id=str(team.id),
            player_id=str(self.player.id),
            added_by_id=str(self.owner.id)
        )
        
        self.assertEqual(membership.team, team)
        self.assertEqual(membership.player, self.player)
        self.assertEqual(membership.role, 'MEMBER')
        self.assertTrue(membership.is_active)

    def test_validate_team_name_uniqueness(self):
        """Test team name uniqueness validation"""
        TeamManager.create_team(
            name='Unique Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        # Should return False for existing name
        self.assertFalse(TeamManager.validate_team_name_uniqueness('Unique Team'))
        
        # Should return True for new name
        self.assertTrue(TeamManager.validate_team_name_uniqueness('New Team'))

    def test_get_teams_by_player(self):
        """Test getting teams by player"""
        team1 = TeamManager.create_team(
            name='Team 1',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        team2 = TeamManager.create_team(
            name='Team 2',
            sport_types=['BADMINTON'],
            owner_id=str(self.player.id)
        )
        
        # Add owner to team2 as member
        TeamManager.add_member(
            team_id=str(team2.id),
            player_id=str(self.owner.id),
            added_by_id=str(self.player.id)
        )
        
        owner_teams = TeamManager.get_teams_by_player(str(self.owner.id))
        self.assertEqual(len(owner_teams), 2)
        self.assertIn(team1, owner_teams)
        self.assertIn(team2, owner_teams)

    def test_get_teams_by_sport(self):
        """Test getting teams by sport"""
        futsal_team = TeamManager.create_team(
            name='Futsal Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        badminton_team = TeamManager.create_team(
            name='Badminton Team',
            sport_types=['BADMINTON'],
            owner_id=str(self.player.id)
        )
        
        mixed_team = TeamManager.create_team(
            name='Mixed Team',
            sport_types=['FUTSAL', 'BADMINTON'],
            owner_id=str(self.owner.id)
        )
        
        futsal_teams = TeamManager.get_teams_by_sport('FUTSAL')
        self.assertEqual(len(futsal_teams), 2)  # futsal_team and mixed_team
        self.assertIn(futsal_team, futsal_teams)
        self.assertIn(mixed_team, futsal_teams)
        
        badminton_teams = TeamManager.get_teams_by_sport('BADMINTON')
        self.assertEqual(len(badminton_teams), 2)  # badminton_team and mixed_team
        self.assertIn(badminton_team, badminton_teams)
        self.assertIn(mixed_team, badminton_teams)


class RoleManagerTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.owner = CustomUser.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='testpass123',
            full_name='Team Owner',
            role='PLAYER'
        )
        
        self.leader = CustomUser.objects.create_user(
            username='leader1',
            email='leader1@test.com',
            password='testpass123',
            full_name='Team Leader',
            role='PLAYER'
        )
        
        self.member = CustomUser.objects.create_user(
            username='member1',
            email='member1@test.com',
            password='testpass123',
            full_name='Team Member',
            role='PLAYER'
        )
        
        self.other_player = CustomUser.objects.create_user(
            username='other1',
            email='other1@test.com',
            password='testpass123',
            full_name='Other Player',
            role='PLAYER'
        )
        
        # Create a team with owner
        self.team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        # Add members to team
        TeamManager.add_member(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            added_by_id=str(self.owner.id)
        )
        
        TeamManager.add_member(
            team_id=str(self.team.id),
            player_id=str(self.member.id),
            added_by_id=str(self.owner.id)
        )

    def test_assign_role_success(self):
        """Test successful role assignment"""
        # Assign leader role
        membership = RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )
        
        self.assertEqual(membership.role, 'LEADER')
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='ROLE_CHANGED'
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.performed_by, self.owner)

    def test_assign_role_insufficient_permissions(self):
        """Test role assignment with insufficient permissions fails"""
        try:
            RoleManager.assign_role(
                team_id=str(self.team.id),
                player_id=str(self.member.id),
                role='LEADER',
                assigned_by_id=str(self.leader.id)  # Leader cannot assign roles
            )
            self.fail("Expected TeamInsufficientPermissionsError was not raised")
        except TeamInsufficientPermissionsError:
            pass  # This is expected

    def test_assign_role_invalid_role(self):
        """Test assignment of invalid role fails"""
        with self.assertRaises(InvalidRoleAssignmentError):
            RoleManager.assign_role(
                team_id=str(self.team.id),
                player_id=str(self.member.id),
                role='INVALID_ROLE',
                assigned_by_id=str(self.owner.id)
            )

    def test_assign_owner_role_fails(self):
        """Test that OWNER role cannot be assigned directly"""
        with self.assertRaises(InvalidRoleAssignmentError):
            RoleManager.assign_role(
                team_id=str(self.team.id),
                player_id=str(self.member.id),
                role='OWNER',
                assigned_by_id=str(self.owner.id)
            )

    def test_owner_cannot_change_own_role(self):
        """Test that owner cannot change their own role"""
        with self.assertRaises(InvalidRoleAssignmentError):
            RoleManager.assign_role(
                team_id=str(self.team.id),
                player_id=str(self.owner.id),
                role='MEMBER',
                assigned_by_id=str(self.owner.id)
            )

    def test_assign_role_non_member(self):
        """Test role assignment to non-member fails"""
        with self.assertRaises(ValidationError):
            RoleManager.assign_role(
                team_id=str(self.team.id),
                player_id=str(self.other_player.id),
                role='LEADER',
                assigned_by_id=str(self.owner.id)
            )

    def test_transfer_ownership_success(self):
        """Test successful ownership transfer"""
        new_owner_membership = RoleManager.transfer_ownership(
            team_id=str(self.team.id),
            new_owner_id=str(self.leader.id),
            current_owner_id=str(self.owner.id)
        )
        
        self.assertEqual(new_owner_membership.role, 'OWNER')
        
        # Check team owner reference was updated
        self.team.refresh_from_db()
        self.assertEqual(self.team.owner, self.leader)
        
        # Check old owner became member
        old_owner_membership = TeamMembership.objects.get(
            team=self.team,
            player=self.owner
        )
        self.assertEqual(old_owner_membership.role, 'MEMBER')
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='OWNERSHIP_TRANSFERRED'
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.performed_by, self.owner)

    def test_transfer_ownership_insufficient_permissions(self):
        """Test ownership transfer with insufficient permissions fails"""
        try:
            RoleManager.transfer_ownership(
                team_id=str(self.team.id),
                new_owner_id=str(self.member.id),
                current_owner_id=str(self.leader.id)  # Leader is not owner
            )
            self.fail("Expected TeamInsufficientPermissionsError was not raised")
        except TeamInsufficientPermissionsError:
            pass  # This is expected

    def test_transfer_ownership_to_non_member(self):
        """Test ownership transfer to non-member fails"""
        with self.assertRaises(OwnershipTransferError):
            RoleManager.transfer_ownership(
                team_id=str(self.team.id),
                new_owner_id=str(self.other_player.id),
                current_owner_id=str(self.owner.id)
            )

    def test_transfer_ownership_to_self(self):
        """Test ownership transfer to self fails"""
        with self.assertRaises(OwnershipTransferError):
            RoleManager.transfer_ownership(
                team_id=str(self.team.id),
                new_owner_id=str(self.owner.id),
                current_owner_id=str(self.owner.id)
            )

    def test_get_player_role(self):
        """Test getting player role"""
        # Test owner role
        owner_role = RoleManager.get_player_role(
            team_id=str(self.team.id),
            player_id=str(self.owner.id)
        )
        self.assertEqual(owner_role, 'OWNER')
        
        # Test member role
        member_role = RoleManager.get_player_role(
            team_id=str(self.team.id),
            player_id=str(self.member.id)
        )
        self.assertEqual(member_role, 'MEMBER')
        
        # Test non-member
        non_member_role = RoleManager.get_player_role(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id)
        )
        self.assertIsNone(non_member_role)

    def test_get_team_leaders(self):
        """Test getting team leaders"""
        # Initially only owner is leader
        leaders = RoleManager.get_team_leaders(str(self.team.id))
        self.assertEqual(len(leaders), 1)
        self.assertIn(self.owner, leaders)
        
        # Assign leader role
        RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )
        
        # Now should have both owner and leader
        leaders = RoleManager.get_team_leaders(str(self.team.id))
        self.assertEqual(len(leaders), 2)
        self.assertIn(self.owner, leaders)
        self.assertIn(self.leader, leaders)

    def test_can_register_for_tournaments(self):
        """Test tournament registration permission check"""
        # Owner can register
        self.assertTrue(RoleManager.can_register_for_tournaments(
            team_id=str(self.team.id),
            player_id=str(self.owner.id)
        ))
        
        # Member cannot register
        self.assertFalse(RoleManager.can_register_for_tournaments(
            team_id=str(self.team.id),
            player_id=str(self.member.id)
        ))
        
        # Assign leader role
        RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )
        
        # Leader can register
        self.assertTrue(RoleManager.can_register_for_tournaments(
            team_id=str(self.team.id),
            player_id=str(self.leader.id)
        ))
        
        # Non-member cannot register
        self.assertFalse(RoleManager.can_register_for_tournaments(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id)
        ))

    def test_can_assign_roles(self):
        """Test role assignment permission check"""
        # Owner can assign roles
        self.assertTrue(RoleManager.can_assign_roles(
            team_id=str(self.team.id),
            player_id=str(self.owner.id)
        ))
        
        # Leader cannot assign roles
        self.assertFalse(RoleManager.can_assign_roles(
            team_id=str(self.team.id),
            player_id=str(self.leader.id)
        ))
        
        # Member cannot assign roles
        self.assertFalse(RoleManager.can_assign_roles(
            team_id=str(self.team.id),
            player_id=str(self.member.id)
        ))
        
        # Non-member cannot assign roles
        self.assertFalse(RoleManager.can_assign_roles(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id)
        ))

    def test_validate_role_assignment_permissions(self):
        """Test role assignment permission validation"""
        # Owner can assign leader role to member
        self.assertTrue(RoleManager.validate_role_assignment_permissions(
            team_id=str(self.team.id),
            assigner_id=str(self.owner.id),
            target_player_id=str(self.member.id),
            new_role='LEADER'
        ))
        
        # Member cannot assign roles
        self.assertFalse(RoleManager.validate_role_assignment_permissions(
            team_id=str(self.team.id),
            assigner_id=str(self.member.id),
            target_player_id=str(self.leader.id),
            new_role='LEADER'
        ))
        
        # Cannot assign OWNER role
        self.assertFalse(RoleManager.validate_role_assignment_permissions(
            team_id=str(self.team.id),
            assigner_id=str(self.owner.id),
            target_player_id=str(self.member.id),
            new_role='OWNER'
        ))
        
        # Owner cannot change own role
        self.assertFalse(RoleManager.validate_role_assignment_permissions(
            team_id=str(self.team.id),
            assigner_id=str(self.owner.id),
            target_player_id=str(self.owner.id),
            new_role='MEMBER'
        ))

    def test_validate_ownership_transfer_permissions(self):
        """Test ownership transfer permission validation"""
        # Valid transfer from owner to member
        self.assertTrue(RoleManager.validate_ownership_transfer_permissions(
            team_id=str(self.team.id),
            current_owner_id=str(self.owner.id),
            new_owner_id=str(self.member.id)
        ))
        
        # Invalid transfer from non-owner
        self.assertFalse(RoleManager.validate_ownership_transfer_permissions(
            team_id=str(self.team.id),
            current_owner_id=str(self.member.id),
            new_owner_id=str(self.leader.id)
        ))
        
        # Invalid transfer to non-member
        self.assertFalse(RoleManager.validate_ownership_transfer_permissions(
            team_id=str(self.team.id),
            current_owner_id=str(self.owner.id),
            new_owner_id=str(self.other_player.id)
        ))
        
        # Invalid transfer to self
        self.assertFalse(RoleManager.validate_ownership_transfer_permissions(
            team_id=str(self.team.id),
            current_owner_id=str(self.owner.id),
            new_owner_id=str(self.owner.id)
        ))

    def test_get_team_members_by_role(self):
        """Test getting team members by role"""
        # Get owners
        owners = RoleManager.get_team_members_by_role(str(self.team.id), 'OWNER')
        self.assertEqual(len(owners), 1)
        self.assertIn(self.owner, owners)
        
        # Get members
        members = RoleManager.get_team_members_by_role(str(self.team.id), 'MEMBER')
        self.assertEqual(len(members), 2)  # leader and member are both members initially
        self.assertIn(self.leader, members)
        self.assertIn(self.member, members)
        
        # Assign leader role
        RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )
        
        # Get leaders
        leaders = RoleManager.get_team_members_by_role(str(self.team.id), 'LEADER')
        self.assertEqual(len(leaders), 1)
        self.assertIn(self.leader, leaders)
        
        # Get members (should now only have one)
        members = RoleManager.get_team_members_by_role(str(self.team.id), 'MEMBER')
        self.assertEqual(len(members), 1)
        self.assertIn(self.member, members)

    def test_get_role_hierarchy_level(self):
        """Test role hierarchy level calculation"""
        self.assertEqual(RoleManager.get_role_hierarchy_level('OWNER'), 3)
        self.assertEqual(RoleManager.get_role_hierarchy_level('LEADER'), 2)
        self.assertEqual(RoleManager.get_role_hierarchy_level('MEMBER'), 1)
        self.assertEqual(RoleManager.get_role_hierarchy_level('INVALID'), 0)

    def test_role_assignment_with_activity_history(self):
        """Test that role assignments are properly recorded in activity history"""
        # Assign leader role
        RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )
        
        # Check activity history
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='ROLE_CHANGED',
            performed_by=self.owner
        ).first()
        
        self.assertIsNotNone(activity)
        self.assertIn(self.leader.full_name, activity.description)
        self.assertIn('MEMBER', activity.description)  # Old role
        self.assertIn('LEADER', activity.description)  # New role
        
        # Check metadata
        self.assertEqual(activity.metadata['player_id'], str(self.leader.id))
        self.assertEqual(activity.metadata['old_role'], 'MEMBER')
        self.assertEqual(activity.metadata['new_role'], 'LEADER')

    def test_ownership_transfer_with_activity_history(self):
        """Test that ownership transfers are properly recorded in activity history"""
        RoleManager.transfer_ownership(
            team_id=str(self.team.id),
            new_owner_id=str(self.leader.id),
            current_owner_id=str(self.owner.id)
        )
        
        # Check activity history
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='OWNERSHIP_TRANSFERRED',
            performed_by=self.owner
        ).first()
        
        self.assertIsNotNone(activity)
        self.assertIn(self.owner.full_name, activity.description)
        self.assertIn(self.leader.full_name, activity.description)
        
        # Check metadata
        self.assertEqual(activity.metadata['previous_owner_id'], str(self.owner.id))
        self.assertEqual(activity.metadata['new_owner_id'], str(self.leader.id))
        self.assertEqual(activity.metadata['new_owner_previous_role'], 'MEMBER')


class InvitationManagerTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        self.owner = CustomUser.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='testpass123',
            full_name='Team Owner',
            role='PLAYER'
        )
        
        self.leader = CustomUser.objects.create_user(
            username='leader1',
            email='leader1@test.com',
            password='testpass123',
            full_name='Team Leader',
            role='PLAYER'
        )
        
        self.player = CustomUser.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Team Player',
            role='PLAYER'
        )
        
        self.other_player = CustomUser.objects.create_user(
            username='other1',
            email='other1@test.com',
            password='testpass123',
            full_name='Other Player',
            role='PLAYER'
        )
        
        # Create a team with owner and leader
        self.team = TeamManager.create_team(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner_id=str(self.owner.id)
        )
        
        # Add leader to team and assign role
        TeamManager.add_member(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            added_by_id=str(self.owner.id)
        )
        
        RoleManager.assign_role(
            team_id=str(self.team.id),
            player_id=str(self.leader.id),
            role='LEADER',
            assigned_by_id=str(self.owner.id)
        )

    def test_send_invitation_success_by_owner(self):
        """Test successful invitation sending by team owner"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        self.assertEqual(invitation.team, self.team)
        self.assertEqual(invitation.player, self.player)
        self.assertEqual(invitation.sender, self.owner)
        self.assertEqual(invitation.status, 'PENDING')
        self.assertIsNotNone(invitation.expires_at)
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='INVITATION_SENT'
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.performed_by, self.owner)

    def test_send_invitation_success_by_leader(self):
        """Test successful invitation sending by team leader"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.leader.id)
        )
        
        self.assertEqual(invitation.sender, self.leader)
        self.assertEqual(invitation.status, 'PENDING')

    def test_send_invitation_insufficient_permissions(self):
        """Test invitation sending with insufficient permissions fails"""
        # Add a regular member
        TeamManager.add_member(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id),
            added_by_id=str(self.owner.id)
        )
        
        with self.assertRaises(InvitationInsufficientPermissionsError):
            InvitationManager.send_invitation(
                team_id=str(self.team.id),
                player_id=str(self.player.id),
                sender_id=str(self.other_player.id)  # Regular member cannot send invitations
            )

    def test_send_invitation_to_existing_member(self):
        """Test invitation sending to existing member fails"""
        # Add player to team first
        TeamManager.add_member(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            added_by_id=str(self.owner.id)
        )
        
        with self.assertRaises(ValidationError):
            InvitationManager.send_invitation(
                team_id=str(self.team.id),
                player_id=str(self.player.id),
                sender_id=str(self.owner.id)
            )

    def test_send_invitation_duplicate_pending(self):
        """Test sending duplicate pending invitation fails"""
        # Send first invitation
        InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Try to send another invitation to same player
        with self.assertRaises(InvitationAlreadyExistsError):
            InvitationManager.send_invitation(
                team_id=str(self.team.id),
                player_id=str(self.player.id),
                sender_id=str(self.leader.id)
            )

    def test_respond_to_invitation_accept(self):
        """Test successful invitation acceptance"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        result = InvitationManager.respond_to_invitation(
            invitation_id=str(invitation.id),
            response='ACCEPTED',
            player_id=str(self.player.id)
        )
        
        self.assertTrue(result)
        
        # Check invitation status updated
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'ACCEPTED')
        self.assertIsNotNone(invitation.responded_at)
        
        # Check player was added to team
        membership = TeamMembership.objects.filter(
            team=self.team,
            player=self.player,
            is_active=True
        ).first()
        self.assertIsNotNone(membership)
        self.assertEqual(membership.role, 'MEMBER')
        
        # Check activity history was recorded
        accept_activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='INVITATION_ACCEPTED'
        ).first()
        self.assertIsNotNone(accept_activity)
        
        member_added_activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='MEMBER_ADDED',
            metadata__added_via_invitation=True
        ).first()
        self.assertIsNotNone(member_added_activity)

    def test_respond_to_invitation_decline(self):
        """Test successful invitation decline"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        result = InvitationManager.respond_to_invitation(
            invitation_id=str(invitation.id),
            response='DECLINED',
            player_id=str(self.player.id)
        )
        
        self.assertTrue(result)
        
        # Check invitation status updated
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'DECLINED')
        self.assertIsNotNone(invitation.responded_at)
        
        # Check player was NOT added to team
        membership = TeamMembership.objects.filter(
            team=self.team,
            player=self.player,
            is_active=True
        ).first()
        self.assertIsNone(membership)
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='INVITATION_DECLINED'
        ).first()
        self.assertIsNotNone(activity)

    def test_respond_to_invitation_wrong_player(self):
        """Test responding to invitation by wrong player fails"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        with self.assertRaises(ValidationError):
            InvitationManager.respond_to_invitation(
                invitation_id=str(invitation.id),
                response='ACCEPTED',
                player_id=str(self.other_player.id)  # Wrong player
            )

    def test_respond_to_invitation_invalid_response(self):
        """Test responding with invalid response fails"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        with self.assertRaises(ValidationError):
            InvitationManager.respond_to_invitation(
                invitation_id=str(invitation.id),
                response='INVALID',
                player_id=str(self.player.id)
            )

    def test_respond_to_expired_invitation(self):
        """Test responding to expired invitation fails"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Manually expire the invitation
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()
        
        with self.assertRaises(InvitationExpiredError):
            InvitationManager.respond_to_invitation(
                invitation_id=str(invitation.id),
                response='ACCEPTED',
                player_id=str(self.player.id)
            )

    def test_get_pending_invitations(self):
        """Test getting pending invitations for a player"""
        # Send invitation
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        pending_invitations = InvitationManager.get_pending_invitations(str(self.player.id))
        
        self.assertEqual(len(pending_invitations), 1)
        self.assertEqual(pending_invitations[0].id, invitation.id)

    def test_get_pending_invitations_excludes_expired(self):
        """Test that expired invitations are excluded from pending list"""
        # Send invitation
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Manually expire the invitation
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()
        
        pending_invitations = InvitationManager.get_pending_invitations(str(self.player.id))
        
        self.assertEqual(len(pending_invitations), 0)
        
        # Check that invitation was marked as expired
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'EXPIRED')

    def test_get_team_invitations(self):
        """Test getting invitations for a team"""
        # Send multiple invitations
        invitation1 = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        invitation2 = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id),
            sender_id=str(self.leader.id)
        )
        
        team_invitations = InvitationManager.get_team_invitations(str(self.team.id))
        
        self.assertEqual(len(team_invitations), 2)
        invitation_ids = [inv.id for inv in team_invitations]
        self.assertIn(invitation1.id, invitation_ids)
        self.assertIn(invitation2.id, invitation_ids)

    def test_get_team_invitations_with_status_filter(self):
        """Test getting team invitations with status filter"""
        # Send invitation and accept it
        invitation1 = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        InvitationManager.respond_to_invitation(
            invitation_id=str(invitation1.id),
            response='ACCEPTED',
            player_id=str(self.player.id)
        )
        
        # Send another invitation (pending)
        invitation2 = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.other_player.id),
            sender_id=str(self.leader.id)
        )
        
        # Get only pending invitations
        pending_invitations = InvitationManager.get_team_invitations(
            str(self.team.id), 
            status='PENDING'
        )
        self.assertEqual(len(pending_invitations), 1)
        self.assertEqual(pending_invitations[0].id, invitation2.id)
        
        # Get only accepted invitations
        accepted_invitations = InvitationManager.get_team_invitations(
            str(self.team.id), 
            status='ACCEPTED'
        )
        self.assertEqual(len(accepted_invitations), 1)
        self.assertEqual(accepted_invitations[0].id, invitation1.id)

    def test_expire_invitations(self):
        """Test automatic invitation expiration"""
        # Send invitation
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Manually set expiration to past
        invitation.expires_at = timezone.now() - timedelta(days=1)
        invitation.save()
        
        # Run expiration process
        expired_count = InvitationManager.expire_invitations()
        
        self.assertEqual(expired_count, 1)
        
        # Check invitation was marked as expired
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'EXPIRED')
        
        # Check activity history was recorded
        activity = ActivityHistory.objects.filter(
            team=self.team,
            event_type='INVITATION_EXPIRED'
        ).first()
        self.assertIsNotNone(activity)

    def test_cancel_invitation_by_sender(self):
        """Test invitation cancellation by sender"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        result = InvitationManager.cancel_invitation(
            invitation_id=str(invitation.id),
            cancelled_by_id=str(self.owner.id)
        )
        
        self.assertTrue(result)
        
        # Check invitation status
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'CANCELLED')
        self.assertIsNotNone(invitation.responded_at)

    def test_cancel_invitation_by_team_leader(self):
        """Test invitation cancellation by team leader"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        result = InvitationManager.cancel_invitation(
            invitation_id=str(invitation.id),
            cancelled_by_id=str(self.leader.id)  # Leader can cancel
        )
        
        self.assertTrue(result)
        
        # Check invitation status
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'CANCELLED')

    def test_cancel_invitation_insufficient_permissions(self):
        """Test invitation cancellation with insufficient permissions fails"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        with self.assertRaises(InvitationInsufficientPermissionsError):
            InvitationManager.cancel_invitation(
                invitation_id=str(invitation.id),
                cancelled_by_id=str(self.other_player.id)  # Not a team member
            )

    def test_get_invitation_status(self):
        """Test getting detailed invitation status"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        status = InvitationManager.get_invitation_status(str(invitation.id))
        
        self.assertEqual(status['id'], str(invitation.id))
        self.assertEqual(status['team']['id'], str(self.team.id))
        self.assertEqual(status['team']['name'], self.team.name)
        self.assertEqual(status['player']['id'], str(self.player.id))
        self.assertEqual(status['sender']['id'], str(self.owner.id))
        self.assertEqual(status['status'], 'PENDING')
        self.assertTrue(status['can_respond'])
        self.assertFalse(status['is_expired'])

    def test_invitation_expiration_automatic(self):
        """Test that invitations automatically expire after 7 days"""
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Check that expiration is set to 7 days from now
        expected_expiry = timezone.now() + timedelta(days=7)
        time_diff = abs((invitation.expires_at - expected_expiry).total_seconds())
        self.assertLess(time_diff, 60)  # Within 1 minute

    def test_team_full_invitation_response(self):
        """Test invitation response when team becomes full"""
        # Send invitation first when team has space
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Fill team to capacity (15 members including owner and leader)
        for i in range(13):  # Owner and leader are already members (2), so add 13 more
            player = CustomUser.objects.create_user(
                username=f'fullteam_player{i}',
                email=f'fullteam_player{i}@test.com',
                password='testpass123',
                full_name=f'Full Team Player {i}',
                role='PLAYER'
            )
            TeamManager.add_member(
                team_id=str(self.team.id),
                player_id=str(player.id),
                added_by_id=str(self.owner.id)
            )
        
        # Verify team is at capacity
        self.team.refresh_from_db()
        self.assertEqual(self.team.member_count, 15)
        self.assertFalse(self.team.can_add_member())
        
        # Try to accept invitation when team is now full
        with self.assertRaises(TeamFullError):
            InvitationManager.respond_to_invitation(
                invitation_id=str(invitation.id),
                response='ACCEPTED',
                player_id=str(self.player.id)
            )
        
        # Check invitation was marked as declined
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'DECLINED')

    def test_invitation_lifecycle_management(self):
        """Test complete invitation lifecycle"""
        # Send invitation
        invitation = InvitationManager.send_invitation(
            team_id=str(self.team.id),
            player_id=str(self.player.id),
            sender_id=str(self.owner.id)
        )
        
        # Check initial state
        self.assertEqual(invitation.status, 'PENDING')
        self.assertTrue(invitation.can_respond())
        self.assertFalse(invitation.is_expired())
        
        # Accept invitation
        InvitationManager.respond_to_invitation(
            invitation_id=str(invitation.id),
            response='ACCEPTED',
            player_id=str(self.player.id)
        )
        
        # Check final state
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, 'ACCEPTED')
        self.assertFalse(invitation.can_respond())
        
        # Verify player is now team member
        membership = TeamMembership.objects.filter(
            team=self.team,
            player=self.player,
            is_active=True
        ).first()
        self.assertIsNotNone(membership)
        self.assertEqual(membership.role, 'MEMBER')