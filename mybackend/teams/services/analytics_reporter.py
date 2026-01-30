"""
Analytics Reporter Service

Generates comprehensive analytics reports with filtering capabilities.
Provides both team and individual metrics with various filtering options.
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from django.db.models import Q
from django.utils import timezone
from dataclasses import dataclass, asdict
from enum import Enum

from teams.models import Team, TeamMembership
from tournaments.models import Tournament, Match
from accounts.models import CustomUser
from teams.services.statistics_aggregator import (
    StatisticsAggregator, TeamStats, PlayerStats, TrendData, DateRange
)


class ReportType(Enum):
    """Types of analytics reports"""
    TEAM_PERFORMANCE = 'team_performance'
    PLAYER_PERFORMANCE = 'player_performance'
    TOURNAMENT_SUMMARY = 'tournament_summary'
    COMPARATIVE_ANALYSIS = 'comparative_analysis'
    TREND_ANALYSIS = 'trend_analysis'


class FilterType(Enum):
    """Types of filters for analytics"""
    DATE_RANGE = 'date_range'
    TOURNAMENT = 'tournament'
    OPPONENT = 'opponent'
    SPORT = 'sport'
    HOME_AWAY = 'home_away'


@dataclass
class AnalyticsFilter:
    """Filter configuration for analytics reports"""
    filter_type: FilterType
    value: Any
    label: str


@dataclass
class AnalyticsReport:
    """Complete analytics report structure"""
    report_id: str
    report_type: ReportType
    title: str
    generated_at: datetime
    filters_applied: List[AnalyticsFilter]
    summary: Dict[str, Any]
    detailed_data: Dict[str, Any]
    charts_data: Dict[str, Any]
    metadata: Dict[str, Any]


class AnalyticsReportingError(Exception):
    """Base exception for analytics reporting errors"""
    pass


class AnalyticsReporter:
    """
    Service for generating comprehensive analytics reports.
    Supports filtering by tournament, date range, opponent, and other criteria.
    """

    @staticmethod
    def generate_team_performance_report(
        team_id: str,
        filters: Optional[List[AnalyticsFilter]] = None,
        include_trends: bool = True,
        include_player_breakdown: bool = True
    ) -> AnalyticsReport:
        """
        Generate comprehensive team performance report.
        
        Args:
            team_id: UUID of the team
            filters: List of filters to apply
            include_trends: Whether to include trend analysis
            include_player_breakdown: Whether to include individual player stats
            
        Returns:
            AnalyticsReport with team performance data
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise AnalyticsReportingError(f"Team with ID {team_id} not found")

        # Apply filters to get filtered data
        date_range, sport_filter, tournament_filter, opponent_filter = AnalyticsReporter._parse_filters(filters or [])

        # Get overall team stats
        overall_stats = StatisticsAggregator.aggregate_team_stats(
            team_id, date_range, sport_filter
        )

        # Get sport-specific stats if no sport filter applied
        sport_breakdown = {}
        if not sport_filter:
            for sport in team.sport_types:
                sport_breakdown[sport] = StatisticsAggregator.aggregate_team_stats(
                    team_id, date_range, sport
                )

        # Generate summary
        summary = {
            'team_name': team.name,
            'total_matches': overall_stats.matches_played,
            'win_rate': overall_stats.win_percentage,
            'current_form': overall_stats.recent_form,
            'performance_trend': overall_stats.performance_trend.value,
            'sports_supported': team.sport_types
        }

        # Detailed data
        detailed_data = {
            'overall_statistics': asdict(overall_stats),
            'sport_breakdown': {sport: asdict(stats) for sport, stats in sport_breakdown.items()},
            'match_history': AnalyticsReporter._get_filtered_match_history(
                team_id, filters, limit=20
            )
        }

        # Include player breakdown if requested
        if include_player_breakdown:
            detailed_data['player_statistics'] = AnalyticsReporter._get_team_player_stats(
                team_id, date_range, sport_filter
            )

        # Include trend analysis if requested
        if include_trends:
            trend_data = StatisticsAggregator.generate_performance_trends(team_id)
            detailed_data['trend_analysis'] = asdict(trend_data)

        # Generate charts data
        charts_data = AnalyticsReporter._generate_team_charts_data(
            overall_stats, sport_breakdown, detailed_data.get('trend_analysis')
        )

        return AnalyticsReport(
            report_id=f"team_{team_id}_{int(timezone.now().timestamp())}",
            report_type=ReportType.TEAM_PERFORMANCE,
            title=f"Team Performance Report - {team.name}",
            generated_at=timezone.now(),
            filters_applied=filters or [],
            summary=summary,
            detailed_data=detailed_data,
            charts_data=charts_data,
            metadata={
                'team_id': team_id,
                'report_period': AnalyticsReporter._get_period_description(date_range),
                'data_completeness': AnalyticsReporter._assess_data_completeness(overall_stats)
            }
        )

    @staticmethod
    def generate_player_performance_report(
        player_id: str,
        team_id: Optional[str] = None,
        filters: Optional[List[AnalyticsFilter]] = None,
        include_comparison: bool = True
    ) -> AnalyticsReport:
        """
        Generate comprehensive player performance report.
        
        Args:
            player_id: UUID of the player
            team_id: Optional team ID to filter stats
            filters: List of filters to apply
            include_comparison: Whether to include comparison with team averages
            
        Returns:
            AnalyticsReport with player performance data
        """
        try:
            player = CustomUser.objects.get(id=player_id)
        except CustomUser.DoesNotExist:
            raise AnalyticsReportingError(f"Player with ID {player_id} not found")

        # Apply filters
        date_range, sport_filter, tournament_filter, opponent_filter = AnalyticsReporter._parse_filters(filters or [])

        # Get player stats
        player_stats = StatisticsAggregator.aggregate_player_stats(
            player_id, team_id, date_range, sport_filter
        )

        # Get team context if team_id provided
        team_context = None
        if team_id:
            try:
                team = Team.objects.get(id=team_id)
                team_stats = StatisticsAggregator.aggregate_team_stats(
                    team_id, date_range, sport_filter
                )
                team_context = {
                    'team_name': team.name,
                    'team_stats': asdict(team_stats),
                    'player_role': AnalyticsReporter._get_player_role_in_team(player_id, team_id)
                }
            except Team.DoesNotExist:
                pass

        # Generate summary
        summary = {
            'player_name': player.full_name,
            'total_matches': player_stats.matches_played,
            'win_rate': player_stats.win_percentage,
            'primary_sport': sport_filter or 'Multiple',
            'team_context': team_context['team_name'] if team_context else 'Multiple Teams'
        }

        # Add sport-specific summary stats
        if sport_filter == 'FUTSAL':
            summary.update({
                'goals_per_match': player_stats.average_goals_per_match,
                'assists_per_match': player_stats.average_assists_per_match,
                'total_goals': player_stats.total_goals
            })
        elif sport_filter == 'BADMINTON':
            summary.update({
                'set_win_rate': player_stats.set_win_percentage,
                'sets_won': player_stats.sets_won,
                'sets_lost': player_stats.sets_lost
            })

        # Detailed data
        detailed_data = {
            'player_statistics': asdict(player_stats),
            'match_history': AnalyticsReporter._get_player_match_history(
                player_id, team_id, filters, limit=15
            )
        }

        if team_context:
            detailed_data['team_context'] = team_context

        # Include comparison if requested and team context available
        if include_comparison and team_context:
            detailed_data['team_comparison'] = AnalyticsReporter._compare_player_to_team(
                player_stats, team_context['team_stats']
            )

        # Generate charts data
        charts_data = AnalyticsReporter._generate_player_charts_data(
            player_stats, detailed_data.get('team_comparison')
        )

        return AnalyticsReport(
            report_id=f"player_{player_id}_{int(timezone.now().timestamp())}",
            report_type=ReportType.PLAYER_PERFORMANCE,
            title=f"Player Performance Report - {player.full_name}",
            generated_at=timezone.now(),
            filters_applied=filters or [],
            summary=summary,
            detailed_data=detailed_data,
            charts_data=charts_data,
            metadata={
                'player_id': player_id,
                'team_id': team_id,
                'report_period': AnalyticsReporter._get_period_description(date_range),
                'data_completeness': AnalyticsReporter._assess_data_completeness(player_stats)
            }
        )

    @staticmethod
    def generate_tournament_summary_report(
        tournament_id: str,
        include_rankings: bool = True,
        include_statistics: bool = True
    ) -> AnalyticsReport:
        """
        Generate comprehensive tournament summary report.
        
        Args:
            tournament_id: UUID of the tournament
            include_rankings: Whether to include final rankings
            include_statistics: Whether to include detailed statistics
            
        Returns:
            AnalyticsReport with tournament summary data
        """
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise AnalyticsReportingError(f"Tournament with ID {tournament_id} not found")

        # Get tournament matches
        matches = Match.objects.filter(tournament=tournament).select_related(
            'team1', 'team2', 'player1', 'player2', 'winner', 'winning_team'
        )

        completed_matches = matches.filter(status='COMPLETED')
        total_matches = matches.count()
        completed_count = completed_matches.count()

        # Generate summary
        summary = {
            'tournament_name': tournament.title,
            'sport_type': tournament.sport_type,
            'registration_type': tournament.registration_type,
            'total_participants': tournament.registered_count,
            'total_matches': total_matches,
            'completed_matches': completed_count,
            'tournament_status': tournament.status,
            'completion_rate': (completed_count / total_matches * 100) if total_matches > 0 else 0
        }

        # Detailed data
        detailed_data = {
            'tournament_info': {
                'title': tournament.title,
                'description': tournament.description,
                'sport_type': tournament.sport_type,
                'tournament_type': tournament.tournament_type,
                'registration_type': tournament.registration_type,
                'date': tournament.date.isoformat(),
                'venue': tournament.venue_name,
                'organizer': tournament.organizer.full_name,
                'entry_fee': float(tournament.entry_fee),
                'prize_pool': float(tournament.prize_pool) if tournament.prize_pool else None
            },
            'participation_stats': {
                'registered_participants': tournament.registered_count,
                'max_participants': tournament.max_participants,
                'registration_rate': (tournament.registered_count / tournament.max_participants * 100)
            }
        }

        # Include rankings if requested and tournament has completed matches
        if include_rankings and completed_count > 0:
            rankings = StatisticsAggregator.calculate_rankings(tournament)
            detailed_data['rankings'] = rankings

        # Include detailed statistics if requested
        if include_statistics and completed_count > 0:
            detailed_data['match_statistics'] = AnalyticsReporter._get_tournament_match_stats(tournament)
            
            if tournament.sport_type == 'FUTSAL':
                detailed_data['futsal_statistics'] = AnalyticsReporter._get_tournament_futsal_stats(tournament)
            elif tournament.sport_type == 'BADMINTON':
                detailed_data['badminton_statistics'] = AnalyticsReporter._get_tournament_badminton_stats(tournament)

        # Generate charts data
        charts_data = AnalyticsReporter._generate_tournament_charts_data(
            tournament, detailed_data
        )

        return AnalyticsReport(
            report_id=f"tournament_{tournament_id}_{int(timezone.now().timestamp())}",
            report_type=ReportType.TOURNAMENT_SUMMARY,
            title=f"Tournament Summary - {tournament.title}",
            generated_at=timezone.now(),
            filters_applied=[],
            summary=summary,
            detailed_data=detailed_data,
            charts_data=charts_data,
            metadata={
                'tournament_id': tournament_id,
                'tournament_status': tournament.status,
                'data_completeness': (completed_count / total_matches) if total_matches > 0 else 0
            }
        )

    @staticmethod
    def generate_comparative_analysis(
        entity_ids: List[str],
        entity_type: str,  # 'team' or 'player'
        filters: Optional[List[AnalyticsFilter]] = None,
        metrics: Optional[List[str]] = None
    ) -> AnalyticsReport:
        """
        Generate comparative analysis report between multiple teams or players.
        
        Args:
            entity_ids: List of team or player IDs to compare
            entity_type: 'team' or 'player'
            filters: List of filters to apply
            metrics: Specific metrics to compare (if None, uses default set)
            
        Returns:
            AnalyticsReport with comparative analysis
        """
        if entity_type not in ['team', 'player']:
            raise AnalyticsReportingError("entity_type must be 'team' or 'player'")

        if len(entity_ids) < 2:
            raise AnalyticsReportingError("At least 2 entities required for comparison")

        # Apply filters
        date_range, sport_filter, tournament_filter, opponent_filter = AnalyticsReporter._parse_filters(filters or [])

        # Get stats for all entities
        entities_data = []
        
        if entity_type == 'team':
            for team_id in entity_ids:
                try:
                    team = Team.objects.get(id=team_id)
                    stats = StatisticsAggregator.aggregate_team_stats(
                        team_id, date_range, sport_filter
                    )
                    entities_data.append({
                        'id': team_id,
                        'name': team.name,
                        'stats': asdict(stats)
                    })
                except Team.DoesNotExist:
                    continue
        else:  # player
            for player_id in entity_ids:
                try:
                    player = CustomUser.objects.get(id=player_id)
                    stats = StatisticsAggregator.aggregate_player_stats(
                        player_id, None, date_range, sport_filter
                    )
                    entities_data.append({
                        'id': player_id,
                        'name': player.full_name,
                        'stats': asdict(stats)
                    })
                except CustomUser.DoesNotExist:
                    continue

        if len(entities_data) < 2:
            raise AnalyticsReportingError("Insufficient valid entities for comparison")

        # Generate comparison metrics
        comparison_metrics = AnalyticsReporter._calculate_comparison_metrics(
            entities_data, metrics or AnalyticsReporter._get_default_comparison_metrics(entity_type)
        )

        # Generate summary
        summary = {
            'comparison_type': f"{entity_type.title()} Comparison",
            'entities_count': len(entities_data),
            'entities_names': [entity['name'] for entity in entities_data],
            'top_performer': comparison_metrics.get('top_performer', {}),
            'key_insights': comparison_metrics.get('key_insights', [])
        }

        # Detailed data
        detailed_data = {
            'entities_data': entities_data,
            'comparison_metrics': comparison_metrics,
            'head_to_head': AnalyticsReporter._get_head_to_head_records(
                entity_ids, entity_type, date_range
            ) if entity_type == 'team' else None
        }

        # Generate charts data
        charts_data = AnalyticsReporter._generate_comparison_charts_data(
            entities_data, comparison_metrics
        )

        return AnalyticsReport(
            report_id=f"comparison_{entity_type}_{int(timezone.now().timestamp())}",
            report_type=ReportType.COMPARATIVE_ANALYSIS,
            title=f"{entity_type.title()} Comparative Analysis",
            generated_at=timezone.now(),
            filters_applied=filters or [],
            summary=summary,
            detailed_data=detailed_data,
            charts_data=charts_data,
            metadata={
                'entity_type': entity_type,
                'entity_ids': entity_ids,
                'comparison_period': AnalyticsReporter._get_period_description(date_range)
            }
        )

    # Private helper methods

    @staticmethod
    def _parse_filters(filters: List[AnalyticsFilter]) -> tuple:
        """Parse filters into specific filter types"""
        date_range = None
        sport_filter = None
        tournament_filter = None
        opponent_filter = None

        for filter_obj in filters:
            if filter_obj.filter_type == FilterType.DATE_RANGE:
                date_range = filter_obj.value
            elif filter_obj.filter_type == FilterType.SPORT:
                sport_filter = filter_obj.value
            elif filter_obj.filter_type == FilterType.TOURNAMENT:
                tournament_filter = filter_obj.value
            elif filter_obj.filter_type == FilterType.OPPONENT:
                opponent_filter = filter_obj.value

        return date_range, sport_filter, tournament_filter, opponent_filter

    @staticmethod
    def _get_filtered_match_history(
        team_id: str, 
        filters: Optional[List[AnalyticsFilter]], 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get filtered match history for a team"""
        team = Team.objects.get(id=team_id)
        matches_query = Match.objects.filter(
            Q(team1=team) | Q(team2=team),
            status='COMPLETED'
        ).select_related('tournament', 'team1', 'team2').order_by('-actual_end_time')

        # Apply filters
        date_range, sport_filter, tournament_filter, opponent_filter = AnalyticsReporter._parse_filters(filters or [])
        
        if date_range:
            matches_query = matches_query.filter(
                actual_end_time__range=[date_range.start_date, date_range.end_date]
            )
        
        if sport_filter:
            matches_query = matches_query.filter(tournament__sport_type=sport_filter)
        
        if tournament_filter:
            matches_query = matches_query.filter(tournament_id=tournament_filter)

        matches = matches_query[:limit]
        
        match_history = []
        for match in matches:
            is_home_team = match.team1 == team
            team_score = match.player1_score if is_home_team else match.player2_score
            opponent_score = match.player2_score if is_home_team else match.player1_score
            opponent = match.team2 if is_home_team else match.team1
            
            result = 'W' if match.winning_team == team else ('D' if match.winning_team is None else 'L')
            
            match_history.append({
                'date': match.actual_end_time.isoformat() if match.actual_end_time else None,
                'tournament': match.tournament.title,
                'opponent': opponent.name if opponent else 'TBD',
                'score': f"{team_score}-{opponent_score}" if team_score is not None else "N/A",
                'result': result,
                'home_away': 'Home' if is_home_team else 'Away'
            })

        return match_history

    @staticmethod
    def _get_team_player_stats(
        team_id: str, 
        date_range: Optional[DateRange], 
        sport_filter: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get statistics for all players in a team"""
        team = Team.objects.get(id=team_id)
        active_members = team.memberships.filter(is_active=True).select_related('player')
        
        player_stats = []
        for membership in active_members:
            stats = StatisticsAggregator.aggregate_player_stats(
                str(membership.player.id), team_id, date_range, sport_filter
            )
            
            player_data = asdict(stats)
            player_data.update({
                'player_name': membership.player.full_name,
                'role': membership.role,
                'joined_at': membership.joined_at.isoformat()
            })
            player_stats.append(player_data)

        # Sort by matches played (most active first)
        player_stats.sort(key=lambda x: x['matches_played'], reverse=True)
        return player_stats

    @staticmethod
    def _get_player_role_in_team(player_id: str, team_id: str) -> str:
        """Get player's role in a specific team"""
        try:
            membership = TeamMembership.objects.get(
                team_id=team_id, 
                player_id=player_id, 
                is_active=True
            )
            return membership.role
        except TeamMembership.DoesNotExist:
            return 'Not a member'

    @staticmethod
    def _get_player_match_history(
        player_id: str,
        team_id: Optional[str],
        filters: Optional[List[AnalyticsFilter]],
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Get match history for a player"""
        # This would be similar to team match history but filtered for player participation
        # Implementation would depend on how player participation is tracked in matches
        return []  # Placeholder

    @staticmethod
    def _compare_player_to_team(
        player_stats: PlayerStats, 
        team_stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare individual player stats to team averages"""
        return {
            'win_rate_vs_team': player_stats.win_percentage - team_stats.get('win_percentage', 0),
            'performance_rating': 'Above Average' if player_stats.win_percentage > team_stats.get('win_percentage', 0) else 'Below Average'
        }

    @staticmethod
    def _generate_team_charts_data(
        overall_stats: TeamStats,
        sport_breakdown: Dict[str, TeamStats],
        trend_analysis: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate chart data for team reports"""
        charts = {
            'win_loss_pie': {
                'type': 'pie',
                'data': [
                    {'label': 'Wins', 'value': overall_stats.wins},
                    {'label': 'Losses', 'value': overall_stats.losses},
                    {'label': 'Draws', 'value': overall_stats.draws}
                ]
            },
            'recent_form': {
                'type': 'line',
                'data': overall_stats.recent_form
            }
        }

        if sport_breakdown:
            charts['sport_performance'] = {
                'type': 'bar',
                'data': [
                    {
                        'sport': sport,
                        'win_rate': stats.win_percentage,
                        'matches': stats.matches_played
                    }
                    for sport, stats in sport_breakdown.items()
                ]
            }

        return charts

    @staticmethod
    def _generate_player_charts_data(
        player_stats: PlayerStats,
        team_comparison: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate chart data for player reports"""
        return {
            'performance_overview': {
                'type': 'bar',
                'data': [
                    {'metric': 'Win Rate', 'value': player_stats.win_percentage},
                    {'metric': 'Matches Played', 'value': player_stats.matches_played}
                ]
            }
        }

    @staticmethod
    def _generate_tournament_charts_data(
        tournament: Tournament,
        detailed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate chart data for tournament reports"""
        return {
            'participation': {
                'type': 'gauge',
                'data': {
                    'current': tournament.registered_count,
                    'max': tournament.max_participants
                }
            }
        }

    @staticmethod
    def _generate_comparison_charts_data(
        entities_data: List[Dict[str, Any]],
        comparison_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate chart data for comparison reports"""
        return {
            'performance_comparison': {
                'type': 'radar',
                'data': entities_data
            }
        }

    @staticmethod
    def _get_tournament_match_stats(tournament: Tournament) -> Dict[str, Any]:
        """Get match statistics for a tournament"""
        matches = Match.objects.filter(tournament=tournament, status='COMPLETED')
        
        return {
            'total_matches': matches.count(),
            'average_score': matches.aggregate(
                avg_home=Avg('player1_score'),
                avg_away=Avg('player2_score')
            )
        }

    @staticmethod
    def _get_tournament_futsal_stats(tournament: Tournament) -> Dict[str, Any]:
        """Get futsal-specific tournament statistics"""
        return {'placeholder': 'futsal_stats'}

    @staticmethod
    def _get_tournament_badminton_stats(tournament: Tournament) -> Dict[str, Any]:
        """Get badminton-specific tournament statistics"""
        return {'placeholder': 'badminton_stats'}

    @staticmethod
    def _calculate_comparison_metrics(
        entities_data: List[Dict[str, Any]],
        metrics: List[str]
    ) -> Dict[str, Any]:
        """Calculate comparison metrics between entities"""
        return {
            'top_performer': entities_data[0] if entities_data else {},
            'key_insights': ['Placeholder insight']
        }

    @staticmethod
    def _get_default_comparison_metrics(entity_type: str) -> List[str]:
        """Get default metrics for comparison based on entity type"""
        if entity_type == 'team':
            return ['win_percentage', 'matches_played', 'average_score']
        else:
            return ['win_percentage', 'matches_played']

    @staticmethod
    def _get_head_to_head_records(
        entity_ids: List[str],
        entity_type: str,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get head-to-head records between entities"""
        return {'placeholder': 'head_to_head'}

    @staticmethod
    def _get_period_description(date_range: Optional[DateRange]) -> str:
        """Get human-readable description of date range"""
        if not date_range:
            return "All time"
        return f"{date_range.start_date.strftime('%Y-%m-%d')} to {date_range.end_date.strftime('%Y-%m-%d')}"

    @staticmethod
    def _assess_data_completeness(stats: Union[TeamStats, PlayerStats]) -> float:
        """Assess completeness of data for reliability scoring"""
        if hasattr(stats, 'matches_played'):
            if stats.matches_played >= 10:
                return 1.0
            elif stats.matches_played >= 5:
                return 0.7
            elif stats.matches_played >= 1:
                return 0.4
        return 0.0