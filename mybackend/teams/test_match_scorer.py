"""
Tests for MatchScorer service

Tests sport-specific match scoring functionality including validation
and error handling for both futsal and badminton matches.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from tournaments.models import Tournament, Match
from teams.models import Team, TeamMembership, FutsalScore, FutsalPlayerStat, BadmintonSet
from teams.services.match_scorer import (
    MatchScorer, MatchScoringError, InvalidScoreError,
    MatchNotFoundError, UnauthorizedScoringError, MatchAlreadyScoredError
)
from teams.services.team_manager import TeamManager


class MatchScorerTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create users
        self.organizer = CustomUser.objects.create_user(
            username='organizer1',
            email='organizer1@test.com',
            password='testpass123',
            full_name='Tournament Organizer',
            role='ORGANIZER'
        )
        
        self.unauthorized_user = CustomUser.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Regular Player',
            role='PLAYER'
        )
        
        # Create team players
        self.team1_owner = CustomUser.objects.create_user(
            username='team1owner',
            email='team1owner@test.com',
            password='testpass123',
            full_name='Team 1 Owner',
            role='PLAYER'
        )
        
        self.team1_player1 = CustomUser.objects.create_user(
            username='team1player1',
            email='team1player1@test.com',
            password='testpass123',
            full_name='Team 1 Player 1',
            role='PLAYER'
        )
        
        self.team2_owner = CustomUser.objects.create_user(
            username='team2owner',
            email='team2owner@test.com',
            password='testpass123',
            full_name='Team 2 Owner',
            role='PLAYER'
        )
        
        # Create teams
        self.team1 = TeamManager.create_team(
            name='Team Alpha',
            sport_types=['FUTSAL'],
            owner_id=str(self.team1_owner.id)
        )
        
        self.team2 = TeamManager.create_team(
            name='Team Beta',
            sport_types=['FUTSAL'],
            owner_id=str(self.team2_owner.id)
        )
        
        # Add players to teams
        TeamManager.add_member(
            team_id=str(self.team1.id),
            player_id=str(self.team1_player1.id),
            added_by_id=str(self.team1_owner.id)
        )
        
        # Create tournaments
        self.futsal_tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Futsal Tournament',
            sport_type='FUTSAL',
            registration_type='TEAM',
            team_size=5,
            date=timezone.now().date() + timedelta(days=30),
            start_time='10:00',
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=7),
            status='ONGOING'
        )
        
        self.badminton_tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Badminton Tournament',
            sport_type='BADMINTON',
            registration_type='TEAM',
            team_size=2,
            date=timezone.now().date() + timedelta(days=30),
            start_time='14:00',
            venue='Test Venue 2',
            entry_fee=25.00,
            max_participants=16,
            registration_deadline=timezone.now() + timedelta(days=7),
            status='ONGOING'
        )
        
        # Create matches
        self.futsal_match = Match.objects.create(
            tournament=self.futsal_tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            status='IN_PROGRESS'
        )
        
        self.badminton_match = Match.objects.create(
            tournament=self.badminton_tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            status='IN_PROGRESS'
        )

    def test_record_futsal_match_success(self):
        """Test successful futsal match recording"""
        home_data = {
            'goals': 3,
            'player_stats': [
                {
                    'player_id': str(self.team1_owner.id),
                    'goals': 2,
                    'assists': 1,
                    'minutes_played': 90
                },
                {
                    'player_id': str(self.team1_player1.id),
                    'goals': 1,
                    'assists': 0,
                    'minutes_played': 85
                }
            ]
        }
        
        away_data = {
            'goals': 1,
            'player_stats': [
                {
                    'player_id': str(self.team2_owner.id),
                    'goals': 1,
                    'assists': 0,
                    'minutes_played': 90
                }
            ]
        }
        
        match = MatchScorer.record_futsal_match(
            match_id=str(self.futsal_match.id),
            home_team_data=home_data,
            away_team_data=away_data,
            organizer_id=str(self.organizer.id)
        )
        
        # Verify match was updated
        self.assertEqual(match.status, 'COMPLETED')
        self.assertEqual(match.player1_score, 3)
        self.assertEqual(match.player2_score, 1)
        self.assertEqual(match.winning_team, self.team1)
        
        # Verify futsal scores were created
        home_score = FutsalScore.objects.get(match=match, team=self.team1)
        self.assertEqual(home_score.goals, 3)
        self.assertEqual(home_score.player_stats.count(), 2)

    def test_record_futsal_match_invalid_goals_sum(self):
        """Test futsal match recording with invalid goals sum"""
        home_data = {
            'goals': 3,
            'player_stats': [
                {
                    'player_id': str(self.team1_owner.id),
                    'goals': 1,  # Sum is 1, but team goals is 3
                    'assists': 1,
                    'minutes_played': 90
                }
            ]
        }
        
        away_data = {
            'goals': 0,
            'player_stats': []
        }
        
        with self.assertRaises(InvalidScoreError) as context:
            MatchScorer.record_futsal_match(
                match_id=str(self.futsal_match.id),
                home_team_data=home_data,
                away_team_data=away_data,
                organizer_id=str(self.organizer.id)
            )
        
        self.assertIn("Sum of player goals must equal team goals", str(context.exception))

    def test_record_badminton_match_success(self):
        """Test successful badminton match recording"""
        sets_data = [
            {
                'set_number': 1,
                'home_score': 21,
                'away_score': 18,
                'duration': 25
            },
            {
                'set_number': 2,
                'home_score': 19,
                'away_score': 21,
                'duration': 28
            },
            {
                'set_number': 3,
                'home_score': 21,
                'away_score': 16,
                'duration': 22
            }
        ]
        
        match = MatchScorer.record_badminton_match(
            match_id=str(self.badminton_match.id),
            sets_data=sets_data,
            organizer_id=str(self.organizer.id)
        )
        
        # Verify match was updated
        self.assertEqual(match.status, 'COMPLETED')
        self.assertEqual(match.player1_score, 2)  # Home won 2 sets
        self.assertEqual(match.player2_score, 1)  # Away won 1 set
        self.assertEqual(match.winning_team, self.team1)
        
        # Verify badminton sets were created
        sets = match.badminton_sets.all().order_by('set_number')
        self.assertEqual(sets.count(), 3)
        self.assertEqual(sets[0].home_score, 21)
        self.assertEqual(sets[0].away_score, 18)

    def test_record_badminton_match_invalid_bwf_score(self):
        """Test badminton match recording with invalid BWF scores"""
        sets_data = [
            {
                'set_number': 1,
                'home_score': 20,  # Invalid: no 2-point lead
                'away_score': 19,
                'duration': 25
            },
            {
                'set_number': 2,
                'home_score': 21,
                'away_score': 10,
                'duration': 20
            }
        ]
        
        with self.assertRaises(InvalidScoreError) as context:
            MatchScorer.record_badminton_match(
                match_id=str(self.badminton_match.id),
                sets_data=sets_data,
                organizer_id=str(self.organizer.id)
            )
        
        self.assertIn("BWF guidelines", str(context.exception))

    def test_unauthorized_scoring_error(self):
        """Test that non-organizers cannot record scores"""
        home_data = {'goals': 1, 'player_stats': []}
        away_data = {'goals': 0, 'player_stats': []}
        
        with self.assertRaises(UnauthorizedScoringError):
            MatchScorer.record_futsal_match(
                match_id=str(self.futsal_match.id),
                home_team_data=home_data,
                away_team_data=away_data,
                organizer_id=str(self.unauthorized_user.id)
            )

    def test_match_not_found_error(self):
        """Test error when match doesn't exist"""
        home_data = {'goals': 1, 'player_stats': []}
        away_data = {'goals': 0, 'player_stats': []}
        
        with self.assertRaises(MatchNotFoundError):
            MatchScorer.record_futsal_match(
                match_id='00000000-0000-0000-0000-000000000000',
                home_team_data=home_data,
                away_team_data=away_data,
                organizer_id=str(self.organizer.id)
            )

    def test_match_already_scored_error(self):
        """Test error when trying to score completed match"""
        # Mark match as completed
        self.futsal_match.status = 'COMPLETED'
        self.futsal_match.save()
        
        home_data = {'goals': 1, 'player_stats': []}
        away_data = {'goals': 0, 'player_stats': []}
        
        with self.assertRaises(MatchAlreadyScoredError):
            MatchScorer.record_futsal_match(
                match_id=str(self.futsal_match.id),
                home_team_data=home_data,
                away_team_data=away_data,
                organizer_id=str(self.organizer.id)
            )

    def test_validate_score_futsal(self):
        """Test score validation for futsal"""
        valid_data = {
            'home_team': {'goals': 2, 'player_stats': []},
            'away_team': {'goals': 1, 'player_stats': []}
        }
        
        result = MatchScorer.validate_score(valid_data, 'FUTSAL')
        self.assertTrue(result['is_valid'])
        self.assertEqual(len(result['errors']), 0)

    def test_validate_score_invalid_sport(self):
        """Test score validation with invalid sport type"""
        data = {'some': 'data'}
        
        result = MatchScorer.validate_score(data, 'INVALID_SPORT')
        self.assertFalse(result['is_valid'])
        self.assertIn('Unsupported sport type', result['errors'][0])


class BadmintonSetModelTestCase(TestCase):
    """Test BadmintonSet model validation methods"""
    
    def test_is_valid_score_standard_win(self):
        """Test standard 21-point win with 2-point lead"""
        set_obj = BadmintonSet(
            set_number=1,
            home_score=21,
            away_score=19,
            duration=25
        )
        self.assertTrue(set_obj.is_valid_score())

    def test_is_valid_score_thirty_point_cap(self):
        """Test 30-point cap rule"""
        set_obj = BadmintonSet(
            set_number=1,
            home_score=30,
            away_score=29,
            duration=35
        )
        self.assertTrue(set_obj.is_valid_score())

    def test_is_valid_score_invalid_no_lead(self):
        """Test invalid score without 2-point lead"""
        set_obj = BadmintonSet(
            set_number=1,
            home_score=21,
            away_score=20,
            duration=25
        )
        self.assertFalse(set_obj.is_valid_score())

    def test_is_valid_score_invalid_over_thirty(self):
        """Test invalid score over 30 points"""
        set_obj = BadmintonSet(
            set_number=1,
            home_score=31,
            away_score=29,
            duration=35
        )
        self.assertFalse(set_obj.is_valid_score())

    def test_get_winner(self):
        """Test set winner determination"""
        set_obj = BadmintonSet(
            set_number=1,
            home_score=21,
            away_score=18,
            duration=25
        )
        self.assertEqual(set_obj.get_winner(), 'home')
        
        set_obj.home_score = 18
        set_obj.away_score = 21
        self.assertEqual(set_obj.get_winner(), 'away')

    def test_validate_match_sets_valid_two_zero(self):
        """Test valid 2-0 match result"""
        sets = [
            BadmintonSet(set_number=1, home_score=21, away_score=18, duration=25),
            BadmintonSet(set_number=2, home_score=21, away_score=19, duration=28)
        ]
        self.assertTrue(BadmintonSet.validate_match_sets(sets))

    def test_validate_match_sets_valid_two_one(self):
        """Test valid 2-1 match result"""
        sets = [
            BadmintonSet(set_number=1, home_score=21, away_score=18, duration=25),
            BadmintonSet(set_number=2, home_score=19, away_score=21, duration=28),
            BadmintonSet(set_number=3, home_score=21, away_score=16, duration=22)
        ]
        self.assertTrue(BadmintonSet.validate_match_sets(sets))

    def test_validate_match_sets_invalid_incomplete(self):
        """Test invalid match with only one set"""
        sets = [
            BadmintonSet(set_number=1, home_score=21, away_score=18, duration=25)
        ]
        self.assertFalse(BadmintonSet.validate_match_sets(sets))