"""
Tests for Statistics and Analytics services
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from tournaments.models import Tournament, Match
from teams.models import (
    Team, TeamMembership, TeamTournamentRegistration, 
    FutsalScore, FutsalPlayerStat, BadmintonSet
)
from teams.services.statistics_aggregator import (
    StatisticsAggregator, DateRange, TrendDirection, 
    StatisticsCalculationError
)
from teams.services.analytics_reporter import (
    AnalyticsReporter, ReportType, FilterType, AnalyticsFilter,
    AnalyticsReportingError
)


class StatisticsAggregatorTestCase(TestCase):
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
        
        self.owner1 = CustomUser.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='testpass123',
            full_name='Team Owner 1',
            role='PLAYER'
        )
        
        self.owner2 = CustomUser.objects.create_user(
            username='owner2',
            email='owner2@test.com',
            password='testpass123',
            full_name='Team Owner 2',
            role='PLAYER'
        )
        
        self.player1 = CustomUser.objects.create_user(
            username='player1',
            email='player1@test.com',
            password='testpass123',
            full_name='Player 1',
            role='PLAYER'
        )
        
        self.player2 = CustomUser.objects.create_user(
            username='player2',
            email='player2@test.com',
            password='testpass123',
            full_name='Player 2',
            role='PLAYER'
        )
        
        # Create teams
        self.team1 = Team.objects.create(
            name='Team Alpha',
            sport_types=['FUTSAL'],
            owner=self.owner1
        )
        
        self.team2 = Team.objects.create(
            name='Team Beta',
            sport_types=['FUTSAL'],
            owner=self.owner2
        )
        
        # Create team memberships
        TeamMembership.objects.create(
            team=self.team1,
            player=self.owner1,
            role='OWNER'
        )
        
        TeamMembership.objects.create(
            team=self.team1,
            player=self.player1,
            role='MEMBER'
        )
        
        TeamMembership.objects.create(
            team=self.team2,
            player=self.owner2,
            role='OWNER'
        )
        
        TeamMembership.objects.create(
            team=self.team2,
            player=self.player2,
            role='MEMBER'
        )
        
        # Create tournament
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Futsal Tournament',
            sport_type='FUTSAL',
            registration_type='TEAM',
            team_size=5,
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=7)
        )
        
        # Create team registrations
        self.reg1 = TeamTournamentRegistration.objects.create(
            tournament=self.tournament,
            team=self.team1,
            registered_by=self.owner1,
            status='CONFIRMED'
        )
        self.reg1.selected_players.add(self.owner1, self.player1)
        
        self.reg2 = TeamTournamentRegistration.objects.create(
            tournament=self.tournament,
            team=self.team2,
            registered_by=self.owner2,
            status='CONFIRMED'
        )
        self.reg2.selected_players.add(self.owner2, self.player2)

    def test_aggregate_team_stats_no_matches(self):
        """Test team stats aggregation with no matches"""
        stats = StatisticsAggregator.aggregate_team_stats(str(self.team1.id))
        
        self.assertEqual(stats.team_id, str(self.team1.id))
        self.assertEqual(stats.matches_played, 0)
        self.assertEqual(stats.wins, 0)
        self.assertEqual(stats.losses, 0)
        self.assertEqual(stats.draws, 0)
        self.assertEqual(stats.win_percentage, 0.0)
        self.assertEqual(stats.average_score, 0.0)
        self.assertEqual(stats.recent_form, [])

    def test_aggregate_team_stats_with_matches(self):
        """Test team stats aggregation with completed matches"""
        # Create a completed match
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,  # Team1 wins 3-1
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=timezone.now()
        )
        
        # Create futsal scores
        futsal_score1 = FutsalScore.objects.create(
            match=match,
            team=self.team1,
            goals=3
        )
        
        futsal_score2 = FutsalScore.objects.create(
            match=match,
            team=self.team2,
            goals=1
        )
        
        # Test team1 stats (winner)
        stats1 = StatisticsAggregator.aggregate_team_stats(str(self.team1.id))
        
        self.assertEqual(stats1.matches_played, 1)
        self.assertEqual(stats1.wins, 1)
        self.assertEqual(stats1.losses, 0)
        self.assertEqual(stats1.draws, 0)
        self.assertEqual(stats1.win_percentage, 100.0)
        self.assertEqual(stats1.average_score, 3.0)
        self.assertEqual(stats1.total_goals, 3)
        self.assertEqual(stats1.recent_form, ['W'])
        
        # Test team2 stats (loser)
        stats2 = StatisticsAggregator.aggregate_team_stats(str(self.team2.id))
        
        self.assertEqual(stats2.matches_played, 1)
        self.assertEqual(stats2.wins, 0)
        self.assertEqual(stats2.losses, 1)
        self.assertEqual(stats2.draws, 0)
        self.assertEqual(stats2.win_percentage, 0.0)
        self.assertEqual(stats2.average_score, 1.0)
        self.assertEqual(stats2.total_goals, 1)
        self.assertEqual(stats2.recent_form, ['L'])

    def test_aggregate_team_stats_with_date_range_filter(self):
        """Test team stats aggregation with date range filter"""
        # Create matches at different times
        old_time = timezone.now() - timedelta(days=30)
        recent_time = timezone.now() - timedelta(days=5)
        
        # Old match
        old_match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=2,
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=old_time
        )
        
        # Recent match
        recent_match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=2,
            team1=self.team1,
            team2=self.team2,
            player1_score=1,
            player2_score=2,
            winning_team=self.team2,
            status='COMPLETED',
            actual_end_time=recent_time
        )
        
        # Test with date range that includes only recent match
        date_range = DateRange(
            start_date=timezone.now() - timedelta(days=10),
            end_date=timezone.now()
        )
        
        stats = StatisticsAggregator.aggregate_team_stats(
            str(self.team1.id), 
            date_range=date_range
        )
        
        self.assertEqual(stats.matches_played, 1)  # Only recent match
        self.assertEqual(stats.wins, 0)  # Team1 lost recent match
        self.assertEqual(stats.losses, 1)

    def test_aggregate_team_stats_with_sport_filter(self):
        """Test team stats aggregation with sport filter"""
        # Create a badminton tournament and match
        badminton_tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Badminton Tournament',
            sport_type='BADMINTON',
            registration_type='TEAM',
            team_size=2,
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=30.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=7)
        )
        
        # Update team to support both sports
        self.team1.sport_types = ['FUTSAL', 'BADMINTON']
        self.team1.save()
        
        # Create futsal match
        futsal_match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=timezone.now()
        )
        
        # Create badminton match
        badminton_match = Match.objects.create(
            tournament=badminton_tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=2,  # Sets won
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=timezone.now()
        )
        
        # Test futsal-only stats
        futsal_stats = StatisticsAggregator.aggregate_team_stats(
            str(self.team1.id), 
            sport_filter='FUTSAL'
        )
        
        self.assertEqual(futsal_stats.matches_played, 1)
        self.assertEqual(futsal_stats.sport, 'FUTSAL')
        self.assertIsNotNone(futsal_stats.total_goals)
        self.assertIsNone(futsal_stats.total_sets)
        
        # Test badminton-only stats
        badminton_stats = StatisticsAggregator.aggregate_team_stats(
            str(self.team1.id), 
            sport_filter='BADMINTON'
        )
        
        self.assertEqual(badminton_stats.matches_played, 1)
        self.assertEqual(badminton_stats.sport, 'BADMINTON')
        self.assertIsNone(badminton_stats.total_goals)
        self.assertIsNotNone(badminton_stats.total_sets)

    def test_aggregate_player_stats_basic(self):
        """Test basic player stats aggregation"""
        # Create a match with player stats
        match = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=timezone.now()
        )
        
        # Create futsal score and player stats
        futsal_score = FutsalScore.objects.create(
            match=match,
            team=self.team1,
            goals=3
        )
        
        FutsalPlayerStat.objects.create(
            futsal_score=futsal_score,
            player=self.player1,
            goals=2,
            assists=1,
            minutes_played=90
        )
        
        # Test player stats
        stats = StatisticsAggregator.aggregate_player_stats(
            str(self.player1.id),
            team_id=str(self.team1.id),
            sport_filter='FUTSAL'
        )
        
        self.assertEqual(stats.player_id, str(self.player1.id))
        self.assertEqual(stats.team_id, str(self.team1.id))
        self.assertEqual(stats.matches_played, 1)
        self.assertEqual(stats.wins, 1)
        self.assertEqual(stats.total_goals, 2)
        self.assertEqual(stats.total_assists, 1)
        self.assertEqual(stats.average_goals_per_match, 2.0)
        self.assertEqual(stats.total_minutes_played, 90)

    def test_aggregate_team_stats_invalid_team(self):
        """Test team stats aggregation with invalid team ID"""
        import uuid
        fake_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        with self.assertRaises(StatisticsCalculationError):
            StatisticsAggregator.aggregate_team_stats(fake_uuid)

    def test_aggregate_player_stats_invalid_player(self):
        """Test player stats aggregation with invalid player ID"""
        import uuid
        fake_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        with self.assertRaises(StatisticsCalculationError):
            StatisticsAggregator.aggregate_player_stats(fake_uuid)

    def test_calculate_rankings_team_tournament(self):
        """Test rankings calculation for team tournament"""
        # Create multiple matches to establish rankings
        match1 = Match.objects.create(
            tournament=self.tournament,
            round_number=1,
            match_number=1,
            team1=self.team1,
            team2=self.team2,
            player1_score=3,
            player2_score=1,
            winning_team=self.team1,
            status='COMPLETED',
            actual_end_time=timezone.now()
        )
        
        rankings = StatisticsAggregator.calculate_rankings(self.tournament)
        
        self.assertEqual(len(rankings), 2)  # Two teams registered
        
        # Team1 should be first (winner)
        self.assertEqual(rankings[0]['team_id'], str(self.team1.id))
        self.assertEqual(rankings[0]['position'], 1)
        self.assertEqual(rankings[0]['points'], 3)  # 3 points for win
        self.assertEqual(rankings[0]['wins'], 1)
        
        # Team2 should be second (loser)
        self.assertEqual(rankings[1]['team_id'], str(self.team2.id))
        self.assertEqual(rankings[1]['position'], 2)
        self.assertEqual(rankings[1]['points'], 0)  # 0 points for loss
        self.assertEqual(rankings[1]['losses'], 1)

    def test_generate_performance_trends_insufficient_data(self):
        """Test performance trends with insufficient data"""
        trend_data = StatisticsAggregator.generate_performance_trends(str(self.team1.id))
        
        self.assertEqual(trend_data.team_id, str(self.team1.id))
        self.assertEqual(trend_data.trend_direction, TrendDirection.INSUFFICIENT_DATA)
        self.assertEqual(trend_data.trend_strength, 0.0)
        self.assertEqual(trend_data.win_rate_change, 0.0)


class AnalyticsReporterTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create basic test data similar to StatisticsAggregatorTestCase
        self.organizer = CustomUser.objects.create_user(
            username='organizer1',
            email='organizer1@test.com',
            password='testpass123',
            full_name='Tournament Organizer',
            role='ORGANIZER'
        )
        
        self.owner1 = CustomUser.objects.create_user(
            username='owner1',
            email='owner1@test.com',
            password='testpass123',
            full_name='Team Owner 1',
            role='PLAYER'
        )
        
        self.team1 = Team.objects.create(
            name='Team Alpha',
            sport_types=['FUTSAL'],
            owner=self.owner1
        )
        
        TeamMembership.objects.create(
            team=self.team1,
            player=self.owner1,
            role='OWNER'
        )
        
        self.tournament = Tournament.objects.create(
            organizer=self.organizer,
            title='Test Tournament',
            sport_type='FUTSAL',
            registration_type='TEAM',
            team_size=5,
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            venue='Test Venue',
            entry_fee=50.00,
            max_participants=8,
            registration_deadline=timezone.now() + timedelta(days=7)
        )

    def test_generate_team_performance_report_basic(self):
        """Test basic team performance report generation"""
        report = AnalyticsReporter.generate_team_performance_report(
            str(self.team1.id),
            include_trends=False,
            include_player_breakdown=False
        )
        
        self.assertEqual(report.report_type, ReportType.TEAM_PERFORMANCE)
        self.assertEqual(report.title, f"Team Performance Report - {self.team1.name}")
        self.assertIn('team_name', report.summary)
        self.assertEqual(report.summary['team_name'], self.team1.name)
        self.assertIn('overall_statistics', report.detailed_data)
        self.assertIn('sport_breakdown', report.detailed_data)
        self.assertIn('match_history', report.detailed_data)

    def test_generate_team_performance_report_invalid_team(self):
        """Test team performance report with invalid team ID"""
        import uuid
        fake_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        with self.assertRaises(AnalyticsReportingError):
            AnalyticsReporter.generate_team_performance_report(fake_uuid)

    def test_generate_player_performance_report_basic(self):
        """Test basic player performance report generation"""
        report = AnalyticsReporter.generate_player_performance_report(
            str(self.owner1.id),
            team_id=str(self.team1.id),
            include_comparison=False
        )
        
        self.assertEqual(report.report_type, ReportType.PLAYER_PERFORMANCE)
        self.assertEqual(report.title, f"Player Performance Report - {self.owner1.full_name}")
        self.assertIn('player_name', report.summary)
        self.assertEqual(report.summary['player_name'], self.owner1.full_name)
        self.assertIn('player_statistics', report.detailed_data)

    def test_generate_player_performance_report_invalid_player(self):
        """Test player performance report with invalid player ID"""
        import uuid
        fake_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        with self.assertRaises(AnalyticsReportingError):
            AnalyticsReporter.generate_player_performance_report(fake_uuid)

    def test_generate_tournament_summary_report_basic(self):
        """Test basic tournament summary report generation"""
        report = AnalyticsReporter.generate_tournament_summary_report(
            str(self.tournament.id),
            include_rankings=False,
            include_statistics=False
        )
        
        self.assertEqual(report.report_type, ReportType.TOURNAMENT_SUMMARY)
        self.assertEqual(report.title, f"Tournament Summary - {self.tournament.title}")
        self.assertIn('tournament_name', report.summary)
        self.assertEqual(report.summary['tournament_name'], self.tournament.title)
        self.assertIn('tournament_info', report.detailed_data)

    def test_generate_tournament_summary_report_invalid_tournament(self):
        """Test tournament summary report with invalid tournament ID"""
        import uuid
        fake_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        with self.assertRaises(AnalyticsReportingError):
            AnalyticsReporter.generate_tournament_summary_report(fake_uuid)

    def test_generate_comparative_analysis_teams(self):
        """Test comparative analysis between teams"""
        # Create second team
        owner2 = CustomUser.objects.create_user(
            username='owner2',
            email='owner2@test.com',
            password='testpass123',
            full_name='Team Owner 2',
            role='PLAYER'
        )
        
        team2 = Team.objects.create(
            name='Team Beta',
            sport_types=['FUTSAL'],
            owner=owner2
        )
        
        report = AnalyticsReporter.generate_comparative_analysis(
            entity_ids=[str(self.team1.id), str(team2.id)],
            entity_type='team'
        )
        
        self.assertEqual(report.report_type, ReportType.COMPARATIVE_ANALYSIS)
        self.assertEqual(report.title, "Team Comparative Analysis")
        self.assertIn('comparison_type', report.summary)
        self.assertEqual(report.summary['entities_count'], 2)
        self.assertIn('entities_data', report.detailed_data)

    def test_generate_comparative_analysis_insufficient_entities(self):
        """Test comparative analysis with insufficient entities"""
        with self.assertRaises(AnalyticsReportingError):
            AnalyticsReporter.generate_comparative_analysis(
                entity_ids=[str(self.team1.id)],  # Only one entity
                entity_type='team'
            )

    def test_generate_comparative_analysis_invalid_entity_type(self):
        """Test comparative analysis with invalid entity type"""
        with self.assertRaises(AnalyticsReportingError):
            AnalyticsReporter.generate_comparative_analysis(
                entity_ids=[str(self.team1.id), str(self.team1.id)],
                entity_type='invalid'
            )

    def test_analytics_filter_parsing(self):
        """Test analytics filter parsing"""
        date_range = DateRange(
            start_date=timezone.now() - timedelta(days=30),
            end_date=timezone.now()
        )
        
        filters = [
            AnalyticsFilter(
                filter_type=FilterType.DATE_RANGE,
                value=date_range,
                label="Last 30 days"
            ),
            AnalyticsFilter(
                filter_type=FilterType.SPORT,
                value='FUTSAL',
                label="Futsal only"
            )
        ]
        
        report = AnalyticsReporter.generate_team_performance_report(
            str(self.team1.id),
            filters=filters,
            include_trends=False,
            include_player_breakdown=False
        )
        
        self.assertEqual(len(report.filters_applied), 2)
        self.assertEqual(report.filters_applied[0].filter_type, FilterType.DATE_RANGE)
        self.assertEqual(report.filters_applied[1].filter_type, FilterType.SPORT)

    def test_report_metadata_generation(self):
        """Test report metadata generation"""
        report = AnalyticsReporter.generate_team_performance_report(
            str(self.team1.id),
            include_trends=False,
            include_player_breakdown=False
        )
        
        self.assertIn('team_id', report.metadata)
        self.assertIn('report_period', report.metadata)
        self.assertIn('data_completeness', report.metadata)
        self.assertEqual(report.metadata['team_id'], str(self.team1.id))
        self.assertEqual(report.metadata['report_period'], "All time")