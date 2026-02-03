"""
Tests for League Tournament API Views

Tests the extended API endpoints for league tournaments:
- TournamentViewSet: generate_schedule, standings, top_scorers, top_assists
- MatchViewSet: submit_result
- PlayerStatsViewSet: my_stats, tournament_stats
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from tournaments.models import Tournament, Match, PlayerMatchStats
from teams.models import Team, TeamMembership, TeamTournamentRegistration
from datetime import date, time, timedelta
from django.utils import timezone

User = get_user_model()


class LeagueAPIViewsTestCase(TestCase):
    """Test case for league tournament API views"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create organizer
        self.organizer = User.objects.create_user(
            username='organizer',
            email='organizer@test.com',
            password='testpass123',
            full_name='Test Organizer',
            role='ORGANIZER'
        )
        
        # Create players
        self.player1 = User.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Player One',
            role='PLAYER'
        )
        self.player2 = User.objects.create_user(
            username='player2',
            email='player2@test.com',
            password='testpass123',
            full_name='Player Two',
            role='PLAYER'
        )
        self.player3 = User.objects.create_user(
            username='player3',
            email='player3@test.com',
            password='testpass123',
            full_name='Player Three',
            role='PLAYER'
        )
        self.player4 = User.objects.create_user(
            username='player4',
            email='player4@test.com',
            password='testpass123',
            full_name='Player Four',
            role='PLAYER'
        )
        
        # Create teams
        self.team1 = Team.objects.create(
            name='Team Alpha',
            sport_types=['FUTSAL'],
            owner=self.player1
        )
        self.team2 = Team.objects.create(
            name='Team Beta',
            sport_types=['FUTSAL'],
            owner=self.player2
        )
        
        # Add team members
        TeamMembership.objects.create(
            team=self.team1,
            player=self.player1,
            role='OWNER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team1,
            player=self.player3,
            role='MEMBER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team2,
            player=self.player2,
            role='OWNER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team2,
            player=self.player4,
            role='MEMBER',
            is_active=True
        )
        
        # Create league tournament
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test League Tournament',
            sport_type='FUTSAL',
            tournament_type='league',
            registration_type='TEAM',
            team_size=5,
            date=date.today() + timedelta(days=7),
            start_time=time(10, 0),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=4,
            min_participants=2,
            registration_deadline=timezone.now() + timedelta(days=3),
            status='UPCOMING'
        )
        
        # Register teams
        self.reg1 = TeamTournamentRegistration.objects.create(
            tournament=self.tournament,
            team=self.team1,
            registered_by=self.player1,
            status='CONFIRMED'
        )
        self.reg1.selected_players.set([self.player1, self.player3])
        
        self.reg2 = TeamTournamentRegistration.objects.create(
            tournament=self.tournament,
            team=self.team2,
            registered_by=self.player2,
            status='CONFIRMED'
        )
        self.reg2.selected_players.set([self.player2, self.player4])
    
    def test_generate_schedule_success(self):
        """Test successful schedule generation"""
        self.client.force_authenticate(user=self.organizer)
        
        url = f'/api/tournaments/tournaments/{self.tournament.id}/generate_schedule/'
        response = self.client.post(url, {'double_round_robin': False})
        
        # Debug: print response details
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data if hasattr(response, 'data') else response.content}")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('matches_created', response.data)
        self.assertGreater(response.data['matches_created'], 0)
        
        # Verify matches were created
        matches = Match.objects.filter(tournament=self.tournament)
        self.assertGreater(matches.count(), 0)
    
    def test_generate_schedule_insufficient_teams(self):
        """Test schedule generation with insufficient teams"""
        # Create tournament with no teams
        tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Empty Tournament',
            sport_type='FUTSAL',
            tournament_type='league',
            registration_type='TEAM',
            date=date.today() + timedelta(days=7),
            start_time=time(10, 0),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=4,
            min_participants=2,
            registration_deadline=timezone.now() + timedelta(days=3)
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/tournaments/{tournament.id}/generate_schedule/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_generate_schedule_non_organizer(self):
        """Test schedule generation by non-organizer"""
        self.client.force_authenticate(user=self.player1)
        
        url = f'/api/tournaments/tournaments/{self.tournament.id}/generate_schedule/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_submit_result_success(self):
        """Test successful match result submission"""
        # Create a match
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            status='SCHEDULED'
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/matches/{match.id}/submit_result/'
        
        data = {
            'home_score': 3,
            'away_score': 2,
            'player_stats': [
                {'player_id': str(self.player1.id), 'goals': 2, 'assists': 1},
                {'player_id': str(self.player3.id), 'goals': 1, 'assists': 0},
                {'player_id': str(self.player2.id), 'goals': 1, 'assists': 1},
                {'player_id': str(self.player4.id), 'goals': 1, 'assists': 0},
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['home_score'], 3)
        self.assertEqual(response.data['away_score'], 2)
        
        # Verify match was updated
        match.refresh_from_db()
        self.assertEqual(match.player1_score, 3)
        self.assertEqual(match.player2_score, 2)
        self.assertEqual(match.status, 'COMPLETED')
        
        # Verify player stats were created
        stats_count = PlayerMatchStats.objects.filter(match=match).count()
        self.assertEqual(stats_count, 4)
    
    def test_submit_result_goals_mismatch(self):
        """Test match result submission with goals sum mismatch"""
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            status='SCHEDULED'
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/matches/{match.id}/submit_result/'
        
        data = {
            'home_score': 3,
            'away_score': 2,
            'player_stats': [
                {'player_id': str(self.player1.id), 'goals': 1, 'assists': 0},  # Only 1 goal, should be 3
                {'player_id': str(self.player2.id), 'goals': 2, 'assists': 0},
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_standings_calculation(self):
        """Test standings calculation endpoint"""
        # Create and complete a match
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED'
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/tournaments/{self.tournament.id}/standings/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('standings', response.data)
        self.assertGreater(len(response.data['standings']), 0)
    
    def test_top_scorers_endpoint(self):
        """Test top scorers endpoint"""
        # Create match and player stats
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player3,
            match=match,
            goals=1,
            assists=0
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/tournaments/{self.tournament.id}/top_scorers/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('top_scorers', response.data)
    
    def test_my_stats_endpoint(self):
        """Test my_stats endpoint for player"""
        # Create match and player stats
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=1
        )
        
        self.client.force_authenticate(user=self.player1)
        url = '/api/tournaments/player-stats/my_stats/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('goals', response.data)
        self.assertIn('assists', response.data)
        self.assertEqual(response.data['goals'], 2)
        self.assertEqual(response.data['assists'], 1)
    
    def test_tournament_type_change_prevention(self):
        """Test that tournament type cannot be changed after matches exist"""
        # Create a match
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            status='SCHEDULED'
        )
        
        self.client.force_authenticate(user=self.organizer)
        url = f'/api/tournaments/tournaments/{self.tournament.id}/'
        
        data = {
            'tournament_type': 'knockout',
            'title': self.tournament.title,
            'sport_type': self.tournament.sport_type,
            'registration_type': self.tournament.registration_type,
            'date': str(self.tournament.date),
            'start_time': str(self.tournament.start_time),
            'venue': self.tournament.venue,
            'entry_fee': str(self.tournament.entry_fee),
            'max_participants': self.tournament.max_participants,
            'min_participants': self.tournament.min_participants,
            'registration_deadline': self.tournament.registration_deadline.isoformat(),
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


if __name__ == '__main__':
    import django
    django.setup()
    from django.test.utils import get_runner
    from django.conf import settings
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['tournaments.test_league_api_views'])
