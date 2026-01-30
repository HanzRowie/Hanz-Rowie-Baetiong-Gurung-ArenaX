"""
StatisticsAggregator Service

Aggregates team and player statistics across all matches and tournaments.
Provides performance trend calculation and comprehensive analytics.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from django.db.models import Q, Count, Sum, Avg, F, Case, When, IntegerField
from django.utils import timezone
from dataclasses import dataclass
from enum import Enum

from teams.models import (
    Team, TeamMembership, FutsalScore, FutsalPlayerStat, 
    BadmintonSet, TeamTournamentRegistration
)
from tournaments.models import Match, Tournament
from accounts.models import CustomUser


class TrendDirection(Enum):
    """Enum for performance trend directions"""
    IMPROVING = 'improving'
    DECLINING = 'declining'
    STABLE = 'stable'
    INSUFFICIENT_DATA = 'insufficient_data'


@dataclass
class DateRange:
    """Date range for filtering statistics"""
    start_date: datetime
    end_date: datetime


@dataclass
class TeamStats:
    """Comprehensive team statistics"""
    team_id: str
    sport: str
    matches_played: int
    wins: int
    losses: int
    draws: int
    win_percentage: float
    average_score: float
    total_goals: Optional[int] = None  # Futsal only
    total_sets: Optional[int] = None   # Badminton only
    performance_trend: TrendDirection = TrendDirection.INSUFFICIENT_DATA
    recent_form: List[str] = None  # Last 5 results: ['W', 'L', 'D', 'W', 'L']


@dataclass
class PlayerStats:
    """Individual player statistics within team context"""
    player_id: str
    team_id: Optional[str]
    sport: str
    matches_played: int
    wins: int
    losses: int
    draws: int
    win_percentage: float
    # Futsal-specific stats
    total_goals: Optional[int] = None
    total_assists: Optional[int] = None
    average_goals_per_match: Optional[float] = None
    average_assists_per_match: Optional[float] = None
    total_minutes_played: Optional[int] = None
    # Badminton-specific stats
    sets_won: Optional[int] = None
    sets_lost: Optional[int] = None
    set_win_percentage: Optional[float] = None


@dataclass
class TrendData:
    """Performance trend data over time"""
    team_id: str
    trend_direction: TrendDirection
    trend_strength: float  # 0.0 to 1.0
    recent_matches: List[Dict[str, Any]]
    win_rate_change: float  # Percentage change over time period
    performance_metrics: Dict[str, float]


class StatisticsCalculationError(Exception):
    """Raised when statistics calculation fails"""
    pass


class StatisticsAggregator:
    """
    Service for aggregating and calculating team and player statistics.
    Provides comprehensive analytics across all matches and tournaments.
    """

    @staticmethod
    def aggregate_team_stats(
        team_id: str, 
        date_range: Optional[DateRange] = None,
        sport_filter: Optional[str] = None
    ) -> TeamStats:
        """
        Aggregate comprehensive statistics for a team.
        
        Args:
            team_id: UUID of the team
            date_range: Optional date range to filter matches
            sport_filter: Optional sport type filter ('FUTSAL' or 'BADMINTON')
            
        Returns:
            TeamStats object with aggregated data
            
        Raises:
            StatisticsCalculationError: If calculation fails
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise StatisticsCalculationError(f"Team with ID {team_id} not found")

        # Build base query for team matches
        matches_query = Match.objects.filter(
            Q(team1=team) | Q(team2=team),
            status='COMPLETED'
        )

        # Apply date range filter
        if date_range:
            matches_query = matches_query.filter(
                actual_end_time__range=[date_range.start_date, date_range.end_date]
            )

        # Apply sport filter
        if sport_filter:
            matches_query = matches_query.filter(tournament__sport_type=sport_filter)

        matches = matches_query.select_related('tournament').order_by('actual_end_time')

        if not matches.exists():
            return TeamStats(
                team_id=team_id,
                sport=sport_filter or 'ALL',
                matches_played=0,
                wins=0,
                losses=0,
                draws=0,
                win_percentage=0.0,
                average_score=0.0,
                recent_form=[]
            )

        # Calculate basic match statistics
        wins = 0
        losses = 0
        draws = 0
        total_score = 0
        recent_form = []

        # Sport-specific aggregations
        total_goals = 0 if sport_filter == 'FUTSAL' or not sport_filter else None
        total_sets = 0 if sport_filter == 'BADMINTON' or not sport_filter else None

        for match in matches:
            # Determine if team was home or away
            is_home_team = match.team1 == team
            team_score = match.player1_score if is_home_team else match.player2_score
            opponent_score = match.player2_score if is_home_team else match.player1_score

            # Handle None scores
            if team_score is None or opponent_score is None:
                continue

            total_score += team_score

            # Determine match result
            if match.winning_team == team:
                wins += 1
                recent_form.append('W')
            elif match.winning_team is None:
                draws += 1
                recent_form.append('D')
            else:
                losses += 1
                recent_form.append('L')

            # Sport-specific aggregations
            if match.tournament.sport_type == 'FUTSAL' and (sport_filter == 'FUTSAL' or not sport_filter):
                if total_goals is not None:
                    total_goals += team_score
            elif match.tournament.sport_type == 'BADMINTON' and (sport_filter == 'BADMINTON' or not sport_filter):
                if total_sets is not None:
                    total_sets += team_score

        matches_played = wins + losses + draws
        win_percentage = (wins / matches_played * 100) if matches_played > 0 else 0.0
        average_score = total_score / matches_played if matches_played > 0 else 0.0

        # Calculate performance trend
        performance_trend = StatisticsAggregator._calculate_performance_trend(
            recent_form[-10:] if len(recent_form) >= 5 else recent_form
        )

        return TeamStats(
            team_id=team_id,
            sport=sport_filter or 'ALL',
            matches_played=matches_played,
            wins=wins,
            losses=losses,
            draws=draws,
            win_percentage=win_percentage,
            average_score=average_score,
            total_goals=total_goals,
            total_sets=total_sets,
            performance_trend=performance_trend,
            recent_form=recent_form[-5:]  # Last 5 matches
        )

    @staticmethod
    def aggregate_player_stats(
        player_id: str, 
        team_id: Optional[str] = None,
        date_range: Optional[DateRange] = None,
        sport_filter: Optional[str] = None
    ) -> PlayerStats:
        """
        Aggregate comprehensive statistics for a player.
        
        Args:
            player_id: UUID of the player
            team_id: Optional team ID to filter stats for specific team
            date_range: Optional date range to filter matches
            sport_filter: Optional sport type filter
            
        Returns:
            PlayerStats object with aggregated data
            
        Raises:
            StatisticsCalculationError: If calculation fails
        """
        try:
            player = CustomUser.objects.get(id=player_id)
        except CustomUser.DoesNotExist:
            raise StatisticsCalculationError(f"Player with ID {player_id} not found")

        # Build base query for player matches
        matches_query = Match.objects.filter(
            status='COMPLETED'
        )

        # Filter by team if specified
        if team_id:
            try:
                team = Team.objects.get(id=team_id)
                matches_query = matches_query.filter(
                    Q(team1=team) | Q(team2=team)
                )
            except Team.DoesNotExist:
                raise StatisticsCalculationError(f"Team with ID {team_id} not found")

        # Apply date range filter
        if date_range:
            matches_query = matches_query.filter(
                actual_end_time__range=[date_range.start_date, date_range.end_date]
            )

        # Apply sport filter
        if sport_filter:
            matches_query = matches_query.filter(tournament__sport_type=sport_filter)

        matches = matches_query.select_related('tournament')

        # Initialize counters
        matches_played = 0
        wins = 0
        losses = 0
        draws = 0

        # Sport-specific stats
        total_goals = 0
        total_assists = 0
        total_minutes_played = 0
        sets_won = 0
        sets_lost = 0

        for match in matches:
            # Check if player participated in this match
            player_participated = False
            player_team = None

            # For team matches, check if player was selected
            if match.tournament.registration_type == 'TEAM':
                # Check team registrations to see if player was selected
                team_reg = None
                if match.team1:
                    try:
                        team_reg = TeamTournamentRegistration.objects.get(
                            tournament=match.tournament,
                            team=match.team1
                        )
                        if team_reg.selected_players.filter(id=player_id).exists():
                            player_participated = True
                            player_team = match.team1
                    except TeamTournamentRegistration.DoesNotExist:
                        pass

                if not player_participated and match.team2:
                    try:
                        team_reg = TeamTournamentRegistration.objects.get(
                            tournament=match.tournament,
                            team=match.team2
                        )
                        if team_reg.selected_players.filter(id=player_id).exists():
                            player_participated = True
                            player_team = match.team2
                    except TeamTournamentRegistration.DoesNotExist:
                        pass
            else:
                # Individual match
                if match.player1_id == player_id or match.player2_id == player_id:
                    player_participated = True

            if not player_participated:
                continue

            matches_played += 1

            # Determine match result for player
            if match.tournament.registration_type == 'TEAM' and player_team:
                if match.winning_team == player_team:
                    wins += 1
                elif match.winning_team is None:
                    draws += 1
                else:
                    losses += 1
            else:
                # Individual match
                if match.winner_id == player_id:
                    wins += 1
                elif match.winner is None:
                    draws += 1
                else:
                    losses += 1

            # Collect sport-specific stats
            if match.tournament.sport_type == 'FUTSAL':
                # Get futsal player stats
                futsal_stats = FutsalPlayerStat.objects.filter(
                    futsal_score__match=match,
                    player_id=player_id
                ).first()

                if futsal_stats:
                    total_goals += futsal_stats.goals
                    total_assists += futsal_stats.assists
                    total_minutes_played += futsal_stats.minutes_played

            elif match.tournament.sport_type == 'BADMINTON':
                # For badminton, count sets won/lost
                badminton_sets = match.badminton_sets.all()
                for badminton_set in badminton_sets:
                    # Determine if player won this set
                    if match.tournament.registration_type == 'TEAM':
                        if player_team == match.team1:
                            if badminton_set.get_winner() == 'home':
                                sets_won += 1
                            else:
                                sets_lost += 1
                        else:
                            if badminton_set.get_winner() == 'away':
                                sets_won += 1
                            else:
                                sets_lost += 1
                    else:
                        # Individual match
                        if match.player1_id == player_id:
                            if badminton_set.get_winner() == 'home':
                                sets_won += 1
                            else:
                                sets_lost += 1
                        else:
                            if badminton_set.get_winner() == 'away':
                                sets_won += 1
                            else:
                                sets_lost += 1

        # Calculate percentages and averages
        win_percentage = (wins / matches_played * 100) if matches_played > 0 else 0.0
        average_goals_per_match = total_goals / matches_played if matches_played > 0 else 0.0
        average_assists_per_match = total_assists / matches_played if matches_played > 0 else 0.0
        set_win_percentage = (sets_won / (sets_won + sets_lost) * 100) if (sets_won + sets_lost) > 0 else 0.0

        return PlayerStats(
            player_id=player_id,
            team_id=team_id,
            sport=sport_filter or 'ALL',
            matches_played=matches_played,
            wins=wins,
            losses=losses,
            draws=draws,
            win_percentage=win_percentage,
            total_goals=total_goals if sport_filter == 'FUTSAL' else None,
            total_assists=total_assists if sport_filter == 'FUTSAL' else None,
            average_goals_per_match=average_goals_per_match if sport_filter == 'FUTSAL' else None,
            average_assists_per_match=average_assists_per_match if sport_filter == 'FUTSAL' else None,
            total_minutes_played=total_minutes_played if sport_filter == 'FUTSAL' else None,
            sets_won=sets_won if sport_filter == 'BADMINTON' else None,
            sets_lost=sets_lost if sport_filter == 'BADMINTON' else None,
            set_win_percentage=set_win_percentage if sport_filter == 'BADMINTON' else None
        )

    @staticmethod
    def calculate_rankings(tournament: Tournament) -> List[Dict[str, Any]]:
        """
        Calculate rankings for a tournament based on match results.
        
        Args:
            tournament: Tournament object to calculate rankings for
            
        Returns:
            List of ranking dictionaries sorted by performance
        """
        if tournament.registration_type == 'TEAM':
            return StatisticsAggregator._calculate_team_rankings(tournament)
        else:
            return StatisticsAggregator._calculate_individual_rankings(tournament)

    @staticmethod
    def generate_performance_trends(team_id: str, months: int = 6) -> TrendData:
        """
        Generate performance trend analysis for a team over specified time period.
        
        Args:
            team_id: UUID of the team
            months: Number of months to analyze (default: 6)
            
        Returns:
            TrendData object with trend analysis
            
        Raises:
            StatisticsCalculationError: If calculation fails
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise StatisticsCalculationError(f"Team with ID {team_id} not found")

        # Define time periods for comparison
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)
        mid_date = start_date + timedelta(days=months * 15)

        # Get matches in two periods for comparison
        early_period = DateRange(start_date, mid_date)
        late_period = DateRange(mid_date, end_date)

        early_stats = StatisticsAggregator.aggregate_team_stats(team_id, early_period)
        late_stats = StatisticsAggregator.aggregate_team_stats(team_id, late_period)

        # Calculate trend direction and strength
        if early_stats.matches_played < 3 or late_stats.matches_played < 3:
            trend_direction = TrendDirection.INSUFFICIENT_DATA
            trend_strength = 0.0
            win_rate_change = 0.0
        else:
            win_rate_change = late_stats.win_percentage - early_stats.win_percentage
            
            if abs(win_rate_change) < 5:  # Less than 5% change
                trend_direction = TrendDirection.STABLE
                trend_strength = abs(win_rate_change) / 5.0
            elif win_rate_change > 0:
                trend_direction = TrendDirection.IMPROVING
                trend_strength = min(win_rate_change / 20.0, 1.0)  # Cap at 1.0
            else:
                trend_direction = TrendDirection.DECLINING
                trend_strength = min(abs(win_rate_change) / 20.0, 1.0)

        # Get recent matches for detailed analysis
        recent_matches_query = Match.objects.filter(
            Q(team1=team) | Q(team2=team),
            status='COMPLETED',
            actual_end_time__gte=start_date
        ).select_related('tournament').order_by('-actual_end_time')[:10]

        recent_matches = []
        for match in recent_matches_query:
            is_home_team = match.team1 == team
            team_score = match.player1_score if is_home_team else match.player2_score
            opponent_score = match.player2_score if is_home_team else match.player1_score
            
            result = 'W' if match.winning_team == team else ('D' if match.winning_team is None else 'L')
            
            recent_matches.append({
                'date': match.actual_end_time,
                'tournament': match.tournament.title,
                'opponent': match.team2.name if is_home_team else match.team1.name,
                'score': f"{team_score}-{opponent_score}" if team_score is not None else "N/A",
                'result': result
            })

        # Performance metrics
        performance_metrics = {
            'early_win_rate': early_stats.win_percentage,
            'late_win_rate': late_stats.win_percentage,
            'early_avg_score': early_stats.average_score,
            'late_avg_score': late_stats.average_score,
            'total_matches': early_stats.matches_played + late_stats.matches_played
        }

        return TrendData(
            team_id=team_id,
            trend_direction=trend_direction,
            trend_strength=trend_strength,
            recent_matches=recent_matches,
            win_rate_change=win_rate_change,
            performance_metrics=performance_metrics
        )

    # Private helper methods

    @staticmethod
    def _calculate_performance_trend(recent_form: List[str]) -> TrendDirection:
        """Calculate performance trend from recent match results"""
        if len(recent_form) < 5:
            return TrendDirection.INSUFFICIENT_DATA

        # Weight recent matches more heavily
        weights = [1, 2, 3, 4, 5]  # Most recent match has highest weight
        weighted_score = 0
        total_weight = 0

        for i, result in enumerate(recent_form[-5:]):
            weight = weights[i]
            if result == 'W':
                weighted_score += 3 * weight
            elif result == 'D':
                weighted_score += 1 * weight
            # Loss adds 0
            total_weight += weight

        average_weighted_score = weighted_score / total_weight if total_weight > 0 else 0

        # Determine trend based on weighted average
        if average_weighted_score >= 2.0:
            return TrendDirection.IMPROVING
        elif average_weighted_score <= 1.0:
            return TrendDirection.DECLINING
        else:
            return TrendDirection.STABLE

    @staticmethod
    def _calculate_team_rankings(tournament: Tournament) -> List[Dict[str, Any]]:
        """Calculate rankings for team tournament"""
        # Get all team registrations for this tournament
        registrations = TeamTournamentRegistration.objects.filter(
            tournament=tournament,
            status='CONFIRMED'
        ).select_related('team')

        rankings = []
        for registration in registrations:
            team = registration.team
            
            # Get team's matches in this tournament
            team_matches = Match.objects.filter(
                tournament=tournament,
                status='COMPLETED'
            ).filter(Q(team1=team) | Q(team2=team))

            wins = team_matches.filter(winning_team=team).count()
            losses = team_matches.exclude(winning_team=team).exclude(winning_team=None).count()
            draws = team_matches.filter(winning_team=None).count()
            matches_played = wins + losses + draws

            # Calculate points (3 for win, 1 for draw, 0 for loss)
            points = (wins * 3) + (draws * 1)

            # Calculate goal/set difference for tiebreaking
            total_for = 0
            total_against = 0
            
            for match in team_matches:
                is_home_team = match.team1 == team
                team_score = match.player1_score if is_home_team else match.player2_score
                opponent_score = match.player2_score if is_home_team else match.player1_score
                
                if team_score is not None and opponent_score is not None:
                    total_for += team_score
                    total_against += opponent_score

            goal_difference = total_for - total_against

            rankings.append({
                'team_id': str(team.id),
                'team_name': team.name,
                'matches_played': matches_played,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'points': points,
                'goals_for': total_for,
                'goals_against': total_against,
                'goal_difference': goal_difference,
                'win_percentage': (wins / matches_played * 100) if matches_played > 0 else 0
            })

        # Sort by points, then goal difference, then goals for
        rankings.sort(key=lambda x: (-x['points'], -x['goal_difference'], -x['goals_for']))
        
        # Add position
        for i, ranking in enumerate(rankings, 1):
            ranking['position'] = i

        return rankings

    @staticmethod
    def _calculate_individual_rankings(tournament: Tournament) -> List[Dict[str, Any]]:
        """Calculate rankings for individual tournament"""
        # Get all individual registrations for this tournament
        registrations = tournament.registrations.filter(status='ACCEPTED').select_related('player')

        rankings = []
        for registration in registrations:
            player = registration.player
            
            # Get player's matches in this tournament
            player_matches = Match.objects.filter(
                tournament=tournament,
                status='COMPLETED'
            ).filter(Q(player1=player) | Q(player2=player))

            wins = player_matches.filter(winner=player).count()
            losses = player_matches.exclude(winner=player).exclude(winner=None).count()
            draws = player_matches.filter(winner=None).count()
            matches_played = wins + losses + draws

            # Calculate points
            points = (wins * 3) + (draws * 1)

            # Calculate score difference
            total_for = 0
            total_against = 0
            
            for match in player_matches:
                is_player1 = match.player1 == player
                player_score = match.player1_score if is_player1 else match.player2_score
                opponent_score = match.player2_score if is_player1 else match.player1_score
                
                if player_score is not None and opponent_score is not None:
                    total_for += player_score
                    total_against += opponent_score

            score_difference = total_for - total_against

            rankings.append({
                'player_id': str(player.id),
                'player_name': player.full_name,
                'matches_played': matches_played,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'points': points,
                'score_for': total_for,
                'score_against': total_against,
                'score_difference': score_difference,
                'win_percentage': (wins / matches_played * 100) if matches_played > 0 else 0
            })

        # Sort by points, then score difference, then score for
        rankings.sort(key=lambda x: (-x['points'], -x['score_difference'], -x['score_for']))
        
        # Add position
        for i, ranking in enumerate(rankings, 1):
            ranking['position'] = i

        return rankings