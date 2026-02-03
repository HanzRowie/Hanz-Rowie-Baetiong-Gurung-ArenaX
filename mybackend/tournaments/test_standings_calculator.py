"""
Unit tests for LeagueStandingsCalculator service.

Tests cover:
- Points calculation (win=3, draw=1, loss=0)
- Goal difference calculation
- Sorting by points, then goal difference, then goals for
- Handling incomplete matches (NULL scores)
- Edge cases and error handling
"""

import pytest
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from tournaments.models import Tournament, Match
from tournaments.services import LeagueStandingsCalculator, StandingsRow
from tournaments.services.standings_calculator import StandingsCalculationError
from teams.models import Team
from accounts.models import CustomUser


class LeagueStandingsCalculatorTestCase(TestCase):
    """Test cases for LeagueStandingsCalculator service"""

    def setUp(self):
        """Set up test data"""
        # Create test organizer
        self.organizer = CustomUser.objects.create_user(
            username='organizer',
            email='organizer@test.com',
            password='testpass123',
            full_name='Test Organizer',
            role='ORGANIZER'
        )
        
        # Create league tournament
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test League',
            sport_type='FUTSAL',
            tournament_type='league',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=7),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=5)
        )
        
        # Create test teams
        self.team_a = Team.objects.create(
            name='Team A',
            sport_types=['FUTSAL'],
            owner=self.organizer
        )
        self.team_b = Team.objects.create(
            name='Team B',
            sport_types=['FUTSAL'],
            owner=self.organizer
        )
        self.team_c = Team.objects.create(
            name='Team C',
            sport_types=['FUTSAL'],
            owner=self.organizer
        )
        self.team_d = Team.objects.create(
            name='Team D',
            sport_types=['FUTSAL'],
            owner=self.organizer
        )
        
        self.calculator = LeagueStandingsCalculator()

    def test_points_calculation_win(self):
        """Test that winning team receives 3 points"""
        # Team A beats Team B 3-1
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Team A should have 3 points
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        self.assertEqual(team_a_row.points, 3)
        self.assertEqual(team_a_row.won, 1)
        self.assertEqual(team_a_row.drawn, 0)
        self.assertEqual(team_a_row.lost, 0)
        
        # Team B should have 0 points
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        self.assertEqual(team_b_row.points, 0)
        self.assertEqual(team_b_row.won, 0)
        self.assertEqual(team_b_row.drawn, 0)
        self.assertEqual(team_b_row.lost, 1)

    def test_points_calculation_draw(self):
        """Test that both teams receive 1 point for a draw"""
        # Team A draws with Team B 2-2
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=2,
            player2_score=2,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Both teams should have 1 point
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        self.assertEqual(team_a_row.points, 1)
        self.assertEqual(team_a_row.drawn, 1)
        
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        self.assertEqual(team_b_row.points, 1)
        self.assertEqual(team_b_row.drawn, 1)

    def test_goal_difference_calculation(self):
        """Test goal difference is calculated correctly"""
        # Team A beats Team B 5-2 (GD: +3)
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=5,
            player2_score=2,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        self.assertEqual(team_a_row.goals_for, 5)
        self.assertEqual(team_a_row.goals_against, 2)
        self.assertEqual(team_a_row.goal_difference, 3)
        
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        self.assertEqual(team_b_row.goals_for, 2)
        self.assertEqual(team_b_row.goals_against, 5)
        self.assertEqual(team_b_row.goal_difference, -3)

    def test_sorting_by_points(self):
        """Test standings are sorted by points (descending)"""
        # Team A: 2 wins = 6 points
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=2,
            player2_score=0,
            status='COMPLETED'
        )
        Match.objects.create(
            tournament=self.tournament,
            round_number=2,
            match_number=1,
            team1=self.team_a,
            team2=self.team_c,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        # Team B: 1 win = 3 points
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team_c,
            team2=self.team_b,
            player1_score=0,
            player2_score=1,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Team A should be first (6 points)
        self.assertEqual(standings[0].team_id, str(self.team_a.id))
        self.assertEqual(standings[0].points, 6)
        
        # Team B should be second (3 points)
        self.assertEqual(standings[1].team_id, str(self.team_b.id))
        self.assertEqual(standings[1].points, 3)

    def test_sorting_by_goal_difference_when_points_equal(self):
        """Test standings use goal difference as tiebreaker when points are equal"""
        # Team A: 1 win, GD = +2
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_c,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        # Team B: 1 win, GD = +1
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team_b,
            team2=self.team_d,
            player1_score=2,
            player2_score=1,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Both have 3 points, but Team A has better GD
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        
        self.assertEqual(team_a_row.points, 3)
        self.assertEqual(team_b_row.points, 3)
        self.assertLess(team_a_row.position, team_b_row.position)
        self.assertEqual(team_a_row.goal_difference, 2)
        self.assertEqual(team_b_row.goal_difference, 1)

    def test_sorting_by_goals_for_when_points_and_gd_equal(self):
        """Test standings use goals for as final tiebreaker"""
        # Team A: 1 win 2-0, GD = +2, GF = 2
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_c,
            player1_score=2,
            player2_score=0,
            status='COMPLETED'
        )
        
        # Team B: 1 win 3-1, GD = +2, GF = 3
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team_b,
            team2=self.team_d,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Both have 3 points and +2 GD, but Team B has more goals
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        
        self.assertEqual(team_a_row.points, 3)
        self.assertEqual(team_b_row.points, 3)
        self.assertEqual(team_a_row.goal_difference, 2)
        self.assertEqual(team_b_row.goal_difference, 2)
        self.assertGreater(team_a_row.position, team_b_row.position)
        self.assertEqual(team_b_row.goals_for, 3)
        self.assertEqual(team_a_row.goals_for, 2)

    def test_handling_incomplete_matches(self):
        """Test that matches with NULL scores are skipped gracefully"""
        # Completed match
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=2,
            player2_score=1,
            status='COMPLETED'
        )
        
        # Incomplete match (NULL scores)
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team_c,
            team2=self.team_d,
            player1_score=None,
            player2_score=None,
            status='SCHEDULED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Team A and B should have stats from completed match
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        self.assertEqual(team_a_row.played, 1)
        
        # Team C and D should not appear in standings (no completed matches)
        # Only teams with completed matches appear in standings
        team_ids_in_standings = [s.team_id for s in standings]
        self.assertNotIn(str(self.team_c.id), team_ids_in_standings)
        self.assertNotIn(str(self.team_d.id), team_ids_in_standings)

    def test_multiple_matches_aggregation(self):
        """Test that statistics are correctly aggregated across multiple matches"""
        # Team A plays 3 matches: 2 wins, 1 draw
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        Match.objects.create(
            tournament=self.tournament,
            round_number=2,
            match_number=1,
            team1=self.team_c,
            team2=self.team_a,
            player1_score=2,
            player2_score=2,
            status='COMPLETED'
        )
        Match.objects.create(
            tournament=self.tournament,
            round_number=3,
            match_number=1,
            team1=self.team_a,
            team2=self.team_d,
            player1_score=4,
            player2_score=0,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        self.assertEqual(team_a_row.played, 3)
        self.assertEqual(team_a_row.won, 2)
        self.assertEqual(team_a_row.drawn, 1)
        self.assertEqual(team_a_row.lost, 0)
        self.assertEqual(team_a_row.points, 7)  # 2*3 + 1*1 = 7
        self.assertEqual(team_a_row.goals_for, 9)  # 3 + 2 + 4 = 9
        self.assertEqual(team_a_row.goals_against, 3)  # 1 + 2 + 0 = 3
        self.assertEqual(team_a_row.goal_difference, 6)

    def test_error_on_knockout_tournament(self):
        """Test that error is raised for non-league tournaments"""
        knockout_tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Knockout Tournament',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            date=timezone.now().date() + timedelta(days=7),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=5)
        )
        
        with self.assertRaises(StandingsCalculationError) as context:
            self.calculator.calculate_standings(str(knockout_tournament.id))
        
        self.assertIn('only available for league tournaments', str(context.exception))

    def test_error_on_nonexistent_tournament(self):
        """Test that error is raised for non-existent tournament"""
        fake_id = '00000000-0000-0000-0000-000000000000'
        
        with self.assertRaises(StandingsCalculationError) as context:
            self.calculator.calculate_standings(fake_id)
        
        self.assertIn('not found', str(context.exception))

    def test_empty_standings_for_no_matches(self):
        """Test that empty standings are returned when no matches exist"""
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        # Should return empty list when no matches
        self.assertEqual(len(standings), 0)

    def test_get_team_position(self):
        """Test getting specific team's position"""
        # Create matches to establish positions
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=3,
            player2_score=0,
            status='COMPLETED'
        )
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team_c,
            team2=self.team_d,
            player1_score=1,
            player2_score=1,
            status='COMPLETED'
        )
        
        position = self.calculator.get_team_position(
            str(self.tournament.id),
            str(self.team_a.id)
        )
        
        self.assertEqual(position, 1)  # Team A should be first

    def test_get_standings_summary(self):
        """Test getting standings summary"""
        # Create a match
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=2,
            player2_score=1,
            status='COMPLETED'
        )
        
        summary = self.calculator.get_standings_summary(str(self.tournament.id))
        
        self.assertEqual(summary['total_teams'], 2)
        self.assertEqual(summary['leader']['team_name'], 'Team A')
        self.assertEqual(summary['leader']['points'], 3)
        self.assertEqual(summary['matches_played'], 1)

    def test_zero_zero_draw(self):
        """Test handling of 0-0 draw"""
        Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=0,
            player2_score=0,
            status='COMPLETED'
        )
        
        standings = self.calculator.calculate_standings(str(self.tournament.id))
        
        team_a_row = next(s for s in standings if s.team_id == str(self.team_a.id))
        team_b_row = next(s for s in standings if s.team_id == str(self.team_b.id))
        
        # Both teams should have 1 point, 0 goals, 0 GD
        self.assertEqual(team_a_row.points, 1)
        self.assertEqual(team_a_row.goals_for, 0)
        self.assertEqual(team_a_row.goal_difference, 0)
        self.assertEqual(team_b_row.points, 1)
        self.assertEqual(team_b_row.goals_for, 0)
        self.assertEqual(team_b_row.goal_difference, 0)
