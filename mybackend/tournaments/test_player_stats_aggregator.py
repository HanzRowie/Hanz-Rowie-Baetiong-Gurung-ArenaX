"""
Unit tests for PlayerStatsAggregator service.

Tests cover:
- Aggregating goals across multiple matches
- Aggregating assists across multiple matches
- Ranking with ties
- Limiting to top 10 players
- Individual player statistics
- Error handling
"""

import pytest
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from tournaments.models import Tournament, Match, PlayerMatchStats
from tournaments.services import PlayerStatsAggregator, PlayerStats
from tournaments.services.player_stats_aggregator import PlayerStatsAggregationError
from teams.models import Team, TeamMembership
from accounts.models import CustomUser


class PlayerStatsAggregatorTestCase(TestCase):
    """Test cases for PlayerStatsAggregator service"""

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
        
        # Create test players
        self.player1 = CustomUser.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Player One',
            role='PLAYER'
        )
        self.player2 = CustomUser.objects.create_user(
            username='player2',
            email='player2@test.com',
            password='testpass123',
            full_name='Player Two',
            role='PLAYER'
        )
        self.player3 = CustomUser.objects.create_user(
            username='player3',
            email='player3@test.com',
            password='testpass123',
            full_name='Player Three',
            role='PLAYER'
        )
        self.player4 = CustomUser.objects.create_user(
            username='player4',
            email='player4@test.com',
            password='testpass123',
            full_name='Player Four',
            role='PLAYER'
        )
        
        # Add players to teams
        TeamMembership.objects.create(
            team=self.team_a,
            player=self.player1,
            role='MEMBER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team_a,
            player=self.player2,
            role='MEMBER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team_b,
            player=self.player3,
            role='MEMBER',
            is_active=True
        )
        TeamMembership.objects.create(
            team=self.team_b,
            player=self.player4,
            role='MEMBER',
            is_active=True
        )
        
        self.aggregator = PlayerStatsAggregator()

    def test_aggregate_goals_single_match(self):
        """Test aggregating goals from a single match"""
        # Create match
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
        
        # Create player statistics
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match,
            goals=1,
            assists=0
        )
        PlayerMatchStats.objects.create(
            player=self.player3,
            match=match,
            goals=1,
            assists=0
        )
        
        # Get top scorers
        top_scorers = self.aggregator.get_top_scorers(str(self.tournament.id))
        
        # Verify results
        self.assertEqual(len(top_scorers), 3)
        self.assertEqual(top_scorers[0].player_name, 'Player One')
        self.assertEqual(top_scorers[0].goals, 2)
        self.assertEqual(top_scorers[0].rank, 1)

    def test_aggregate_goals_multiple_matches(self):
        """Test aggregating goals across multiple matches"""
        # Create first match
        match1 = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=3,
            player2_score=1,
            status='COMPLETED'
        )
        
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match1,
            goals=2,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match1,
            goals=1,
            assists=0
        )
        
        # Create second match
        match2 = Match.objects.create(
            tournament=self.tournament,
            round_number=2,
            match_number=2,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=2,
            player2_score=2,
            status='COMPLETED'
        )
        
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match2,
            goals=1,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match2,
            goals=1,
            assists=0
        )
        
        # Get top scorers
        top_scorers = self.aggregator.get_top_scorers(str(self.tournament.id))
        
        # Player 1 should have 3 goals total (2 + 1)
        player1_stats = next(s for s in top_scorers if s.player_id == str(self.player1.id))
        self.assertEqual(player1_stats.goals, 3)
        
        # Player 2 should have 2 goals total (1 + 1)
        player2_stats = next(s for s in top_scorers if s.player_id == str(self.player2.id))
        self.assertEqual(player2_stats.goals, 2)

    def test_ranking_with_ties(self):
        """Test that players with same goals get same rank"""
        # Create match
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=4,
            player2_score=2,
            status='COMPLETED'
        )
        
        # Create player statistics with ties
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=0
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match,
            goals=2,
            assists=0
        )
        PlayerMatchStats.objects.create(
            player=self.player3,
            match=match,
            goals=1,
            assists=0
        )
        PlayerMatchStats.objects.create(
            player=self.player4,
            match=match,
            goals=1,
            assists=0
        )
        
        # Get top scorers
        top_scorers = self.aggregator.get_top_scorers(str(self.tournament.id))
        
        # Players 1 and 2 should both have rank 1
        player1_stats = next(s for s in top_scorers if s.player_id == str(self.player1.id))
        player2_stats = next(s for s in top_scorers if s.player_id == str(self.player2.id))
        self.assertEqual(player1_stats.rank, 1)
        self.assertEqual(player2_stats.rank, 1)
        
        # Players 3 and 4 should both have rank 3 (not 2, because two players are tied at rank 1)
        player3_stats = next(s for s in top_scorers if s.player_id == str(self.player3.id))
        player4_stats = next(s for s in top_scorers if s.player_id == str(self.player4.id))
        self.assertEqual(player3_stats.rank, 3)
        self.assertEqual(player4_stats.rank, 3)

    def test_limit_to_top_10(self):
        """Test that leaderboard limits to top 10 players"""
        # Create match
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team_a,
            team2=self.team_b,
            player1_score=15,
            player2_score=0,
            status='COMPLETED'
        )
        
        # Create 15 players with different goal counts
        players = []
        for i in range(15):
            player = CustomUser.objects.create_user(
                username=f'player{i+10}',
                email=f'player{i+10}@test.com',
                password='testpass123',
                full_name=f'Player {i+10}',
                role='PLAYER'
            )
            players.append(player)
            
            PlayerMatchStats.objects.create(
                player=player,
                match=match,
                goals=15 - i,  # Descending goals
                assists=0
            )
        
        # Get top scorers
        top_scorers = self.aggregator.get_top_scorers(str(self.tournament.id), limit=10)
        
        # Should return exactly 10 players
        self.assertEqual(len(top_scorers), 10)
        
        # First player should have 15 goals
        self.assertEqual(top_scorers[0].goals, 15)
        
        # Last player should have 6 goals (15 - 9)
        self.assertEqual(top_scorers[9].goals, 6)

    def test_get_top_assists(self):
        """Test getting top assist providers"""
        # Create match
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
        
        # Create player statistics
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=1,
            assists=2
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
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
        
        # Get top assists
        top_assists = self.aggregator.get_top_assists(str(self.tournament.id))
        
        # Verify results
        self.assertEqual(len(top_assists), 3)
        self.assertEqual(top_assists[0].player_name, 'Player One')
        self.assertEqual(top_assists[0].assists, 2)
        self.assertEqual(top_assists[0].rank, 1)

    def test_get_player_stats(self):
        """Test getting individual player statistics"""
        # Create match
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
        
        # Create player statistics
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match,
            goals=1,
            assists=0
        )
        
        # Get player 1 stats
        player_stats = self.aggregator.get_player_stats(
            str(self.player1.id),
            str(self.tournament.id)
        )
        
        # Verify results
        self.assertEqual(player_stats.player_name, 'Player One')
        self.assertEqual(player_stats.goals, 2)
        self.assertEqual(player_stats.assists, 1)
        self.assertEqual(player_stats.rank, 1)

    def test_error_tournament_not_found(self):
        """Test error handling when tournament not found"""
        with self.assertRaises(PlayerStatsAggregationError) as context:
            self.aggregator.get_top_scorers('00000000-0000-0000-0000-000000000000')
        
        self.assertIn('not found', str(context.exception))

    def test_error_knockout_tournament(self):
        """Test error handling for knockout tournaments"""
        # Create knockout tournament
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
        
        with self.assertRaises(PlayerStatsAggregationError) as context:
            self.aggregator.get_top_scorers(str(knockout_tournament.id))
        
        self.assertIn('only available for league tournaments', str(context.exception))

    def test_empty_statistics(self):
        """Test handling when no player statistics exist"""
        # Get top scorers for tournament with no matches
        top_scorers = self.aggregator.get_top_scorers(str(self.tournament.id))
        
        # Should return empty list
        self.assertEqual(len(top_scorers), 0)

    def test_tournament_stats_summary(self):
        """Test getting tournament statistics summary"""
        # Create match
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
        
        # Create player statistics
        PlayerMatchStats.objects.create(
            player=self.player1,
            match=match,
            goals=2,
            assists=1
        )
        PlayerMatchStats.objects.create(
            player=self.player2,
            match=match,
            goals=1,
            assists=2
        )
        PlayerMatchStats.objects.create(
            player=self.player3,
            match=match,
            goals=1,
            assists=0
        )
        
        # Get summary
        summary = self.aggregator.get_tournament_stats_summary(str(self.tournament.id))
        
        # Verify results
        self.assertEqual(summary['total_goals'], 4)
        self.assertEqual(summary['total_assists'], 3)
        self.assertEqual(summary['total_players'], 3)
        self.assertEqual(summary['top_scorer']['player_name'], 'Player One')
        self.assertEqual(summary['top_scorer']['goals'], 2)
        self.assertEqual(summary['top_assister']['player_name'], 'Player Two')
        self.assertEqual(summary['top_assister']['assists'], 2)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
