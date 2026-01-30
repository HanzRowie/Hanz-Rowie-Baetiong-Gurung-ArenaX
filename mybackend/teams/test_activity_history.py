import pytest
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.core.exceptions import ValidationError
from accounts.models import CustomUser
from .models import Team, TeamMembership, ActivityHistory
from .services.activity_history import ActivityHistoryService


class ActivityHistoryServiceTest(TestCase):
    """Test cases for ActivityHistoryService"""

    def setUp(self):
        """Set up test data"""
        # Create test users
        self.owner = CustomUser.objects.create_user(
            username='owner_user',
            email='owner@test.com',
            password='testpass123',
            full_name='Team Owner',
            role='PLAYER'
        )
        
        self.member = CustomUser.objects.create_user(
            username='member_user',
            email='member@test.com',
            password='testpass123',
            full_name='Team Member',
            role='PLAYER'
        )

        # Create test team
        self.team = Team.objects.create(
            name='Test Team',
            sport_types=['FUTSAL'],
            owner=self.owner
        )

        # Create team memberships
        TeamMembership.objects.create(
            team=self.team,
            player=self.owner,
            role='OWNER'
        )

        TeamMembership.objects.create(
            team=self.team,
            player=self.member,
            role='MEMBER'
        )

    def test_record_activity_success(self):
        """Test successful activity recording"""
        activity = ActivityHistoryService.record_activity(
            team_id=str(self.team.id),
            event_type='MEMBER_ADDED',
            description='Test member was added',
            performed_by_id=str(self.owner.id),
            metadata={'test_key': 'test_value'}
        )

        self.assertIsInstance(activity, ActivityHistory)
        self.assertEqual(activity.team, self.team)
        self.assertEqual(activity.event_type, 'MEMBER_ADDED')
        self.assertEqual(activity.description, 'Test member was added')
        self.assertEqual(activity.performed_by, self.owner)
        self.assertEqual(activity.metadata['test_key'], 'test_value')

    def test_record_activity_invalid_event_type(self):
        """Test recording activity with invalid event type"""
        with self.assertRaises(ValidationError):
            ActivityHistoryService.record_activity(
                team_id=str(self.team.id),
                event_type='INVALID_EVENT',
                description='Test description'
            )

    def test_record_activity_invalid_team(self):
        """Test recording activity for non-existent team"""
        with self.assertRaises(Team.DoesNotExist):
            ActivityHistoryService.record_activity(
                team_id='00000000-0000-0000-0000-000000000000',
                event_type='MEMBER_ADDED',
                description='Test description'
            )

    def test_get_team_activity_history(self):
        """Test retrieving team activity history"""
        # Create some test activities
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        activities = ActivityHistoryService.get_team_activity_history(str(self.team.id))

        self.assertEqual(len(activities), 2)
        # Should be ordered by timestamp descending (newest first)
        self.assertEqual(activities[0].event_type, 'MEMBER_ADDED')
        self.assertEqual(activities[1].event_type, 'TEAM_CREATED')

    def test_get_team_activity_history_with_filters(self):
        """Test retrieving team activity history with filters"""
        # Create activities with different event types
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        # Filter by event type
        activities = ActivityHistoryService.get_team_activity_history(
            str(self.team.id),
            event_types=['MEMBER_ADDED']
        )

        self.assertEqual(len(activities), 1)
        self.assertEqual(activities[0].event_type, 'MEMBER_ADDED')

        # Filter by performer
        activities = ActivityHistoryService.get_team_activity_history(
            str(self.team.id),
            performed_by_id=str(self.owner.id)
        )

        self.assertEqual(len(activities), 2)

    def test_get_activity_by_event_type(self):
        """Test retrieving activities by specific event type"""
        # Create activities
        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='First member added',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Second member added',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='ROLE_CHANGED',
            description='Role was changed',
            performed_by=self.owner
        )

        activities = ActivityHistoryService.get_activity_by_event_type(
            str(self.team.id),
            'MEMBER_ADDED'
        )

        self.assertEqual(len(activities), 2)
        for activity in activities:
            self.assertEqual(activity.event_type, 'MEMBER_ADDED')

    def test_get_recent_activity(self):
        """Test retrieving recent activity"""
        # Create an old activity
        old_activity = ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )
        # Manually set timestamp to 10 days ago
        old_activity.timestamp = timezone.now() - timedelta(days=10)
        old_activity.save()

        # Create a recent activity
        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        # Get recent activity (last 7 days)
        recent_activities = ActivityHistoryService.get_recent_activity(
            str(self.team.id),
            days=7
        )

        self.assertEqual(len(recent_activities), 1)
        self.assertEqual(recent_activities[0].event_type, 'MEMBER_ADDED')

    def test_get_activity_summary(self):
        """Test getting activity summary"""
        # Create various activities
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Another member was added',
            performed_by=self.member
        )

        summary = ActivityHistoryService.get_activity_summary(str(self.team.id))

        self.assertEqual(summary['team_id'], str(self.team.id))
        self.assertEqual(summary['team_name'], self.team.name)
        self.assertEqual(summary['total_activities'], 3)
        self.assertEqual(summary['event_type_counts']['MEMBER_ADDED'], 2)
        self.assertEqual(summary['event_type_counts']['TEAM_CREATED'], 1)
        self.assertIsNotNone(summary['most_active_user'])

    def test_search_activity_history(self):
        """Test searching activity history"""
        # Create activities with different descriptions
        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='John Doe was added to the team',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Jane Smith joined the team',
            performed_by=self.owner
        )

        # Search for activities containing "John"
        results = ActivityHistoryService.search_activity_history(
            str(self.team.id),
            'John'
        )

        self.assertEqual(len(results), 1)
        self.assertIn('John Doe', results[0].description)

    def test_get_activity_timeline_grouped(self):
        """Test getting activity timeline grouped by date"""
        # Create activities
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        timeline = ActivityHistoryService.get_activity_timeline(
            str(self.team.id),
            group_by_date=True
        )

        self.assertIsInstance(timeline, dict)
        # Should have activities grouped by today's date
        today = timezone.now().date().isoformat()
        self.assertIn(today, timeline)
        self.assertEqual(len(timeline[today]), 2)

    def test_get_user_activity_in_team(self):
        """Test getting activities performed by specific user"""
        # Create activities by different users
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.member
        )

        # Get activities by owner
        owner_activities = ActivityHistoryService.get_user_activity_in_team(
            str(self.team.id),
            str(self.owner.id)
        )

        self.assertEqual(len(owner_activities), 1)
        self.assertEqual(owner_activities[0].event_type, 'TEAM_CREATED')

        # Get activities by member
        member_activities = ActivityHistoryService.get_user_activity_in_team(
            str(self.team.id),
            str(self.member.id)
        )

        self.assertEqual(len(member_activities), 1)
        self.assertEqual(member_activities[0].event_type, 'MEMBER_ADDED')

    def test_get_activity_statistics(self):
        """Test getting comprehensive activity statistics"""
        # Create activities
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Member was added',
            performed_by=self.owner
        )

        stats = ActivityHistoryService.get_activity_statistics(str(self.team.id))

        self.assertEqual(stats['team_id'], str(self.team.id))
        self.assertEqual(stats['team_name'], self.team.name)
        self.assertEqual(stats['total_activities'], 2)
        self.assertIsNotNone(stats['first_activity'])
        self.assertIsNotNone(stats['last_activity'])
        self.assertIn('TEAM_CREATED', stats['event_type_breakdown'])
        self.assertIn('MEMBER_ADDED', stats['event_type_breakdown'])

    def test_export_activity_history_dict(self):
        """Test exporting activity history as dictionary"""
        # Create activity
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner,
            metadata={'test': 'data'}
        )

        exported_data = ActivityHistoryService.export_activity_history(
            str(self.team.id),
            format='dict'
        )

        self.assertIsInstance(exported_data, list)
        self.assertEqual(len(exported_data), 1)
        
        activity_data = exported_data[0]
        self.assertEqual(activity_data['event_type'], 'TEAM_CREATED')
        self.assertEqual(activity_data['description'], 'Team was created')
        self.assertEqual(activity_data['performed_by'], self.owner.full_name)
        self.assertEqual(activity_data['metadata']['test'], 'data')

    def test_export_activity_history_csv(self):
        """Test exporting activity history as CSV"""
        # Create activity
        ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Team was created',
            performed_by=self.owner
        )

        exported_data = ActivityHistoryService.export_activity_history(
            str(self.team.id),
            format='csv'
        )

        self.assertIsInstance(exported_data, str)
        self.assertIn('ID,Event Type,Description', exported_data)
        self.assertIn('TEAM_CREATED', exported_data)
        self.assertIn('Team was created', exported_data)

    def test_delete_old_activities(self):
        """Test deleting old activity records"""
        # Create an old activity
        old_activity = ActivityHistory.objects.create(
            team=self.team,
            event_type='TEAM_CREATED',
            description='Old team creation',
            performed_by=self.owner
        )
        # Set timestamp to 400 days ago
        old_activity.timestamp = timezone.now() - timedelta(days=400)
        old_activity.save()

        # Create a recent activity
        ActivityHistory.objects.create(
            team=self.team,
            event_type='MEMBER_ADDED',
            description='Recent member addition',
            performed_by=self.owner
        )

        # Delete activities older than 365 days
        deleted_count = ActivityHistoryService.delete_old_activities(
            str(self.team.id),
            days_to_keep=365
        )

        self.assertEqual(deleted_count, 1)
        
        # Verify only recent activity remains
        remaining_activities = ActivityHistory.objects.filter(team=self.team)
        self.assertEqual(remaining_activities.count(), 1)
        self.assertEqual(remaining_activities.first().event_type, 'MEMBER_ADDED')