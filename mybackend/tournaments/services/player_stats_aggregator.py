"""
PlayerStatsAggregator Service

Aggregates player statistics across matches for league tournaments.
Calculates player rankings with tie handling for goals and assists leaderboards.
"""

from typing import List, Optional, Dict
from dataclasses import dataclass
from django.db.models import Sum, Count, Q
from tournaments.models import Tournament, PlayerMatchStats
from accounts.models import CustomUser


@dataclass
class PlayerStats:
    """
    Represents aggregated statistics for a single player.
    Contains performance metrics and ranking information.
    """
    player_id: str  # UUID as string
    player_name: str
    team_name: str
    goals: int
    assists: int
    rank: int
    total_players: int


class PlayerStatsAggregationError(Exception):
    """Raised when player statistics aggregation fails"""
    pass


class PlayerStatsAggregator:
    """
    Service for aggregating player statistics across matches.
    
    Provides methods for:
    - Getting top goal scorers
    - Getting top assist providers
    - Getting individual player statistics
    - Calculating rankings with tie handling
    """

    def get_top_scorers(self, tournament_id: str, limit: int = 10) -> List[PlayerStats]:
        """
        Get top goal scorers for a tournament.
        
        Args:
            tournament_id: UUID of the tournament
            limit: Maximum number of players to return (default 10)
            
        Returns:
            List of PlayerStats objects sorted by goals (descending)
            
        Raises:
            PlayerStatsAggregationError: If tournament not found or invalid type
        """
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise PlayerStatsAggregationError(f"Tournament {tournament_id} not found")
        
        if tournament.tournament_type != 'league':
            raise PlayerStatsAggregationError(
                f"Player statistics are only available for league tournaments. "
                f"Tournament type is '{tournament.tournament_type}'"
            )
        
        # Import FutsalPlayerStat from teams app
        from teams.models import FutsalPlayerStat
        
        # Aggregate goals for each player in this tournament using FutsalPlayerStat
        player_stats = FutsalPlayerStat.objects.filter(
            futsal_score__match__tournament=tournament
        ).values(
            'player__id',
            'player__full_name'
        ).annotate(
            total_goals=Sum('goals'),
            total_assists=Sum('assists')
        ).order_by('-total_goals', '-total_assists')
        
        # Get total number of players with statistics
        total_players = player_stats.count()
        
        # Convert to PlayerStats objects with rankings
        result = []
        current_rank = 1
        previous_goals = None
        players_at_rank = 0
        
        for idx, stats in enumerate(player_stats[:limit], start=1):
            goals = stats['total_goals'] or 0
            assists = stats['total_assists'] or 0
            
            # Handle tied rankings
            if previous_goals is not None and goals < previous_goals:
                current_rank = idx
            
            # Get player's team name
            team_name = self._get_player_team_name(stats['player__id'], tournament_id)
            
            player_stat = PlayerStats(
                player_id=str(stats['player__id']),
                player_name=stats['player__full_name'],
                team_name=team_name,
                goals=goals,
                assists=assists,
                rank=current_rank,
                total_players=total_players
            )
            result.append(player_stat)
            
            previous_goals = goals
        
        return result

    def get_top_assists(self, tournament_id: str, limit: int = 10) -> List[PlayerStats]:
        """
        Get top assist providers for a tournament.
        
        Args:
            tournament_id: UUID of the tournament
            limit: Maximum number of players to return (default 10)
            
        Returns:
            List of PlayerStats objects sorted by assists (descending)
            
        Raises:
            PlayerStatsAggregationError: If tournament not found or invalid type
        """
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise PlayerStatsAggregationError(f"Tournament {tournament_id} not found")
        
        if tournament.tournament_type != 'league':
            raise PlayerStatsAggregationError(
                f"Player statistics are only available for league tournaments. "
                f"Tournament type is '{tournament.tournament_type}'"
            )
        
        # Import FutsalPlayerStat from teams app
        from teams.models import FutsalPlayerStat
        
        # Aggregate assists for each player in this tournament using FutsalPlayerStat
        player_stats = FutsalPlayerStat.objects.filter(
            futsal_score__match__tournament=tournament
        ).values(
            'player__id',
            'player__full_name'
        ).annotate(
            total_goals=Sum('goals'),
            total_assists=Sum('assists')
        ).order_by('-total_assists', '-total_goals')
        
        # Get total number of players with statistics
        total_players = player_stats.count()
        
        # Convert to PlayerStats objects with rankings
        result = []
        current_rank = 1
        previous_assists = None
        
        for idx, stats in enumerate(player_stats[:limit], start=1):
            goals = stats['total_goals'] or 0
            assists = stats['total_assists'] or 0
            
            # Handle tied rankings
            if previous_assists is not None and assists < previous_assists:
                current_rank = idx
            
            # Get player's team name
            team_name = self._get_player_team_name(stats['player__id'], tournament_id)
            
            player_stat = PlayerStats(
                player_id=str(stats['player__id']),
                player_name=stats['player__full_name'],
                team_name=team_name,
                goals=goals,
                assists=assists,
                rank=current_rank,
                total_players=total_players
            )
            result.append(player_stat)
            
            previous_assists = assists
        
        return result

    def get_player_stats(self, player_id: str, tournament_id: Optional[str] = None) -> PlayerStats:
        """
        Get aggregated statistics for a specific player.
        
        Args:
            player_id: UUID of the player
            tournament_id: Optional UUID of tournament to filter by
            
        Returns:
            PlayerStats object with aggregated statistics and ranking
            
        Raises:
            PlayerStatsAggregationError: If player not found or has no statistics
        """
        try:
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
        except CustomUser.DoesNotExist:
            raise PlayerStatsAggregationError(f"Player {player_id} not found")
        
        # Build query filter
        query_filter = Q(player=player)
        if tournament_id:
            try:
                tournament = Tournament.objects.get(id=tournament_id)
                if tournament.tournament_type != 'league':
                    raise PlayerStatsAggregationError(
                        f"Player statistics are only available for league tournaments"
                    )
                query_filter &= Q(match__tournament=tournament)
            except Tournament.DoesNotExist:
                raise PlayerStatsAggregationError(f"Tournament {tournament_id} not found")
        else:
            # Only include league tournaments
            query_filter &= Q(match__tournament__tournament_type='league')
        
        # Aggregate player's statistics
        stats = PlayerMatchStats.objects.filter(query_filter).aggregate(
            total_goals=Sum('goals'),
            total_assists=Sum('assists')
        )
        
        goals = stats['total_goals'] or 0
        assists = stats['total_assists'] or 0
        
        # Calculate rankings
        if tournament_id:
            goals_rank, total_players = self._calculate_rank_for_stat(
                player_id, tournament_id, 'goals', goals
            )
            assists_rank, _ = self._calculate_rank_for_stat(
                player_id, tournament_id, 'assists', assists
            )
        else:
            # Global ranking across all league tournaments
            goals_rank, total_players = self._calculate_global_rank_for_stat(
                player_id, 'goals', goals
            )
            assists_rank, _ = self._calculate_global_rank_for_stat(
                player_id, 'assists', assists
            )
        
        # Get player's team name
        team_name = self._get_player_team_name(player_id, tournament_id)
        
        return PlayerStats(
            player_id=str(player_id),
            player_name=player.full_name,
            team_name=team_name,
            goals=goals,
            assists=assists,
            rank=goals_rank,  # Use goals rank as primary rank
            total_players=total_players
        )

    def _get_player_team_name(self, player_id: str, tournament_id: Optional[str] = None) -> str:
        """
        Get the team name for a player in a specific tournament.
        
        Args:
            player_id: UUID of the player
            tournament_id: Optional UUID of tournament
            
        Returns:
            Team name or "No Team" if player has no team
        """
        from teams.models import TeamMembership, FutsalPlayerStat
        
        try:
            if tournament_id:
                # Get team for this specific tournament
                # Find a match the player participated in for this tournament
                player_stat = FutsalPlayerStat.objects.filter(
                    player_id=player_id,
                    futsal_score__match__tournament_id=tournament_id
                ).select_related('futsal_score__team').first()
                
                if player_stat and player_stat.futsal_score:
                    return player_stat.futsal_score.team.name
            else:
                # Get player's current active team
                team_membership = TeamMembership.objects.filter(
                    player_id=player_id,
                    is_active=True
                ).select_related('team').first()
                
                if team_membership:
                    return team_membership.team.name
        except Exception:
            pass
        
        return "No Team"

    def _calculate_rank_for_stat(
        self, 
        player_id: str, 
        tournament_id: str, 
        stat_type: str, 
        stat_value: int
    ) -> tuple[int, int]:
        """
        Calculate rank for a player's statistic in a tournament.
        
        Args:
            player_id: UUID of the player
            tournament_id: UUID of the tournament
            stat_type: 'goals' or 'assists'
            stat_value: The player's stat value
            
        Returns:
            Tuple of (rank, total_players)
        """
        # Get all players' stats for this tournament
        if stat_type == 'goals':
            all_stats = PlayerMatchStats.objects.filter(
                match__tournament_id=tournament_id
            ).values('player__id').annotate(
                total=Sum('goals')
            ).order_by('-total')
        else:  # assists
            all_stats = PlayerMatchStats.objects.filter(
                match__tournament_id=tournament_id
            ).values('player__id').annotate(
                total=Sum('assists')
            ).order_by('-total')
        
        total_players = all_stats.count()
        
        # Calculate rank (players with higher stats)
        rank = 1
        for stats in all_stats:
            total = stats['total'] or 0
            if total > stat_value:
                rank += 1
            elif total == stat_value and str(stats['player__id']) == str(player_id):
                break
        
        return rank, total_players

    def _calculate_global_rank_for_stat(
        self, 
        player_id: str, 
        stat_type: str, 
        stat_value: int
    ) -> tuple[int, int]:
        """
        Calculate global rank for a player's statistic across all league tournaments.
        
        Args:
            player_id: UUID of the player
            stat_type: 'goals' or 'assists'
            stat_value: The player's stat value
            
        Returns:
            Tuple of (rank, total_players)
        """
        # Get all players' stats across all league tournaments
        if stat_type == 'goals':
            all_stats = PlayerMatchStats.objects.filter(
                match__tournament__tournament_type='league'
            ).values('player__id').annotate(
                total=Sum('goals')
            ).order_by('-total')
        else:  # assists
            all_stats = PlayerMatchStats.objects.filter(
                match__tournament__tournament_type='league'
            ).values('player__id').annotate(
                total=Sum('assists')
            ).order_by('-total')
        
        total_players = all_stats.count()
        
        # Calculate rank (players with higher stats)
        rank = 1
        for stats in all_stats:
            total = stats['total'] or 0
            if total > stat_value:
                rank += 1
            elif total == stat_value and str(stats['player__id']) == str(player_id):
                break
        
        return rank, total_players

    def get_tournament_stats_summary(self, tournament_id: str) -> Dict:
        """
        Get a summary of player statistics for a tournament.
        
        Args:
            tournament_id: UUID of the tournament
            
        Returns:
            Dictionary with summary information
        """
        try:
            tournament = Tournament.objects.get(id=tournament_id)
        except Tournament.DoesNotExist:
            raise PlayerStatsAggregationError(f"Tournament {tournament_id} not found")
        
        if tournament.tournament_type != 'league':
            raise PlayerStatsAggregationError(
                f"Player statistics are only available for league tournaments"
            )
        
        # Get statistics
        stats = PlayerMatchStats.objects.filter(
            match__tournament=tournament
        ).aggregate(
            total_goals=Sum('goals'),
            total_assists=Sum('assists'),
            total_players=Count('player', distinct=True)
        )
        
        top_scorer = self.get_top_scorers(tournament_id, limit=1)
        top_assister = self.get_top_assists(tournament_id, limit=1)
        
        return {
            'total_goals': stats['total_goals'] or 0,
            'total_assists': stats['total_assists'] or 0,
            'total_players': stats['total_players'] or 0,
            'top_scorer': {
                'player_name': top_scorer[0].player_name,
                'goals': top_scorer[0].goals
            } if top_scorer else None,
            'top_assister': {
                'player_name': top_assister[0].player_name,
                'assists': top_assister[0].assists
            } if top_assister else None
        }
