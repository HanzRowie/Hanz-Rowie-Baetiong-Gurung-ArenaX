"""
Player statistics and ranking system for sport-specific performance tracking.
"""

from django.db.models import Q, Count, Sum, Avg, F, Case, When, IntegerField
from django.contrib.auth import get_user_model
from typing import Dict, List, Optional, Any
from teams.models import FutsalPlayerStat, BadmintonSet, TeamTournamentRegistration
from tournaments.models import Tournament, Match, TournamentRegistration

User = get_user_model()


class PlayerStatisticsService:
    """Service for calculating and retrieving player statistics and rankings."""
    
    @staticmethod
    def get_player_stats(player_id: str, sport_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a specific player.
        
        Args:
            player_id: UUID of the player
            sport_filter: Optional sport filter ('FUTSAL', 'BADMINTON', or None for all)
            
        Returns:
            Dictionary containing player statistics
        """
        try:
            player = User.objects.get(id=player_id, role='PLAYER')
        except User.DoesNotExist:
            raise ValueError("Player not found")
        
        # Base query for tournaments
        tournament_query = Q()
        if sport_filter:
            tournament_query &= Q(tournament__sport_type=sport_filter)
        
        # Get tournament registrations
        individual_registrations = TournamentRegistration.objects.filter(
            player=player,
            status='ACCEPTED'
        ).filter(tournament_query)
        
        team_registrations = TeamTournamentRegistration.objects.filter(
            selected_players=player,
            status='CONFIRMED'
        ).filter(tournament_query)
        
        # Calculate general statistics
        tournaments_played = individual_registrations.count() + team_registrations.count()
        
        # Get matches played
        individual_matches = Match.objects.filter(
            Q(player1=player) | Q(player2=player),
            status='COMPLETED'
        ).filter(tournament_query)
        
        team_matches = Match.objects.filter(
            Q(team1__in=team_registrations.values_list('team', flat=True)) |
            Q(team2__in=team_registrations.values_list('team', flat=True)),
            status='COMPLETED'
        ).filter(tournament_query)
        
        matches_played = individual_matches.count() + team_matches.count()
        
        # Calculate wins
        individual_wins = individual_matches.filter(winner=player).count()
        team_wins = team_matches.filter(
            Q(winning_team__in=team_registrations.values_list('team', flat=True))
        ).count()
        
        matches_won = individual_wins + team_wins
        win_rate = (matches_won / matches_played * 100) if matches_played > 0 else 0.0
        
        # Tournament wins
        tournaments_won = 0
        for registration in individual_registrations:
            if registration.tournament.matches.filter(winner=player).exists():
                # Check if player won the tournament (simplified logic)
                final_matches = registration.tournament.matches.filter(
                    round_number=registration.tournament.matches.aggregate(
                        max_round=models.Max('round_number')
                    )['max_round']
                )
                if final_matches.filter(winner=player).exists():
                    tournaments_won += 1
        
        # Base statistics
        stats = {
            'tournaments_played': tournaments_played,
            'tournaments_won': tournaments_won,
            'matches_played': matches_played,
            'matches_won': matches_won,
            'win_rate': win_rate,
        }
        
        # Sport-specific statistics
        if sport_filter == 'FUTSAL' or sport_filter is None:
            futsal_stats = PlayerStatisticsService._get_futsal_stats(player, sport_filter)
            stats.update(futsal_stats)
        
        if sport_filter == 'BADMINTON' or sport_filter is None:
            badminton_stats = PlayerStatisticsService._get_badminton_stats(player, sport_filter)
            stats.update(badminton_stats)
        
        # Get rankings
        if sport_filter:
            rankings = PlayerStatisticsService.get_player_rankings(player_id, sport_filter)
            stats['sport_rankings'] = {sport_filter: rankings}
        else:
            stats['sport_rankings'] = {}
            for sport in ['FUTSAL', 'BADMINTON']:
                try:
                    rankings = PlayerStatisticsService.get_player_rankings(player_id, sport)
                    if rankings['ranking'] > 0:  # Only include if player has played this sport
                        stats['sport_rankings'][sport] = rankings
                except:
                    continue
        
        return stats
    
    @staticmethod
    def _get_futsal_stats(player, sport_filter: Optional[str] = None) -> Dict[str, Any]:
        """Get Futsal-specific statistics for a player."""
        # Get all futsal player stats
        futsal_stats = FutsalPlayerStat.objects.filter(player=player)
        
        if sport_filter == 'FUTSAL':
            futsal_stats = futsal_stats.filter(
                futsal_score__match__tournament__sport_type='FUTSAL'
            )
        
        # Aggregate basic statistics
        aggregated = futsal_stats.aggregate(
            total_goals=Sum('goals'),
            total_assists=Sum('assists'),
            total_minutes=Sum('minutes_played'),
            match_count=Count('id'),
            # Enhanced statistics
            total_shots_on_target=Sum('shots_on_target'),
            total_shots_off_target=Sum('shots_off_target'),
            total_tackles=Sum('tackles'),
            total_interceptions=Sum('interceptions'),
            total_clearances=Sum('clearances'),
            total_yellow_cards=Sum('yellow_cards'),
            total_red_cards=Sum('red_cards'),
            total_fouls_committed=Sum('fouls_committed'),
            total_fouls_suffered=Sum('fouls_suffered'),
            total_passes_completed=Sum('passes_completed'),
            total_passes_attempted=Sum('passes_attempted'),
        )
        
        total_goals = aggregated['total_goals'] or 0
        total_assists = aggregated['total_assists'] or 0
        match_count = aggregated['match_count'] or 0
        total_minutes = aggregated['total_minutes'] or 0
        total_shots_on_target = aggregated['total_shots_on_target'] or 0
        total_shots_off_target = aggregated['total_shots_off_target'] or 0
        total_passes_completed = aggregated['total_passes_completed'] or 0
        total_passes_attempted = aggregated['total_passes_attempted'] or 0
        
        # Calculate derived statistics
        total_shots = total_shots_on_target + total_shots_off_target
        shot_accuracy = (total_shots_on_target / total_shots * 100) if total_shots > 0 else 0.0
        pass_accuracy = (total_passes_completed / total_passes_attempted * 100) if total_passes_attempted > 0 else 0.0
        
        # Get recent form (last 5 matches)
        recent_matches = futsal_stats.select_related(
            'futsal_score__match__tournament',
            'futsal_score__team'
        ).order_by('-futsal_score__match__created_at')[:5]
        
        recent_form = []
        for stat in recent_matches:
            match = stat.futsal_score.match
            player_team = stat.futsal_score.team
            
            # Determine opponent and result
            opponent_team = match.team2 if match.team1 == player_team else match.team1
            
            # Get match result
            home_score = match.futsal_scores.filter(team=match.team1).first()
            away_score = match.futsal_scores.filter(team=match.team2).first()
            
            if home_score and away_score:
                if player_team == match.team1:
                    player_goals = home_score.goals
                    opponent_goals = away_score.goals
                else:
                    player_goals = away_score.goals
                    opponent_goals = home_score.goals
                
                if player_goals > opponent_goals:
                    result = 'W'
                elif player_goals < opponent_goals:
                    result = 'L'
                else:
                    result = 'D'
            else:
                result = 'D'  # Default if scores not available
            
            recent_form.append({
                'match_date': match.created_at.date().isoformat(),
                'opponent': opponent_team.name if opponent_team else 'Unknown',
                'goals': stat.goals,
                'assists': stat.assists,
                'minutes_played': stat.minutes_played,
                'result': result
            })
        
        return {
            'total_goals': total_goals,
            'total_assists': total_assists,
            'total_minutes_played': total_minutes,
            'total_matches': match_count,
            'goals_per_match': total_goals / match_count if match_count > 0 else 0.0,
            'assists_per_match': total_assists / match_count if match_count > 0 else 0.0,
            'minutes_per_match': total_minutes / match_count if match_count > 0 else 0.0,
            'shot_accuracy': shot_accuracy,
            'pass_accuracy': pass_accuracy,
            'total_shots_on_target': total_shots_on_target,
            'total_shots_off_target': total_shots_off_target,
            'total_tackles': aggregated['total_tackles'] or 0,
            'total_interceptions': aggregated['total_interceptions'] or 0,
            'total_clearances': aggregated['total_clearances'] or 0,
            'total_yellow_cards': aggregated['total_yellow_cards'] or 0,
            'total_red_cards': aggregated['total_red_cards'] or 0,
            'total_fouls_committed': aggregated['total_fouls_committed'] or 0,
            'total_fouls_suffered': aggregated['total_fouls_suffered'] or 0,
            'recent_form': recent_form
        }
    
    @staticmethod
    def _get_badminton_stats(player, sport_filter: Optional[str] = None) -> Dict[str, Any]:
        """Get Badminton-specific statistics for a player."""
        # Get matches where player participated
        matches_query = Q(
            Q(player1=player) | Q(player2=player) |
            Q(team1__teammembership__player=player) | Q(team2__teammembership__player=player)
        )
        
        if sport_filter == 'BADMINTON':
            matches_query &= Q(tournament__sport_type='BADMINTON')
        
        matches = Match.objects.filter(matches_query, status='COMPLETED')
        
        sets_won = 0
        sets_lost = 0
        
        for match in matches:
            sets = BadmintonSet.objects.filter(match=match).order_by('set_number')
            
            for set_obj in sets:
                # Determine if player/team won this set
                player_is_home = (
                    match.player1 == player or 
                    (match.team1 and match.team1.memberships.filter(player=player).exists())
                )
                
                if player_is_home:
                    if set_obj.home_score > set_obj.away_score:
                        sets_won += 1
                    else:
                        sets_lost += 1
                else:
                    if set_obj.away_score > set_obj.home_score:
                        sets_won += 1
                    else:
                        sets_lost += 1
        
        total_sets = sets_won + sets_lost
        set_win_rate = (sets_won / total_sets * 100) if total_sets > 0 else 0.0
        
        return {
            'sets_won': sets_won,
            'sets_lost': sets_lost,
            'set_win_rate': set_win_rate,
        }
    
    @staticmethod
    def get_sport_leaderboard(
        sport: str, 
        category: str = 'overall', 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get leaderboard for a specific sport and category.
        
        Args:
            sport: 'FUTSAL' or 'BADMINTON'
            category: 'overall', 'goals', 'assists', 'wins', 'sets'
            limit: Maximum number of entries to return
            
        Returns:
            List of leaderboard entries
        """
        # Get all players who have played this sport
        if sport == 'FUTSAL':
            player_ids = FutsalPlayerStat.objects.filter(
                futsal_score__match__tournament__sport_type='FUTSAL'
            ).values_list('player_id', flat=True).distinct()
        else:  # BADMINTON
            player_ids = Match.objects.filter(
                tournament__sport_type='BADMINTON',
                status='COMPLETED'
            ).values_list('player1_id', 'player2_id').distinct()
            # Flatten the list
            player_ids = set()
            for match in Match.objects.filter(tournament__sport_type='BADMINTON', status='COMPLETED'):
                if match.player1_id:
                    player_ids.add(match.player1_id)
                if match.player2_id:
                    player_ids.add(match.player2_id)
                # Also include team players
                if match.team1:
                    player_ids.update(match.team1.memberships.values_list('player_id', flat=True))
                if match.team2:
                    player_ids.update(match.team2.memberships.values_list('player_id', flat=True))
        
        leaderboard = []
        
        for player_id in player_ids:
            try:
                stats = PlayerStatisticsService.get_player_stats(str(player_id), sport)
                player = User.objects.get(id=player_id)
                
                # Calculate category-specific value for sorting
                if category == 'goals' and sport == 'FUTSAL':
                    sort_value = stats.get('total_goals', 0)
                elif category == 'assists' and sport == 'FUTSAL':
                    sort_value = stats.get('total_assists', 0)
                elif category == 'wins':
                    sort_value = stats.get('tournaments_won', 0)
                elif category == 'sets' and sport == 'BADMINTON':
                    sort_value = stats.get('sets_won', 0)
                else:  # overall
                    # Calculate performance score
                    sort_value = (
                        stats.get('tournaments_won', 0) * 10 +
                        stats.get('matches_won', 0) * 3 +
                        stats.get('win_rate', 0) / 10
                    )
                    if sport == 'FUTSAL':
                        sort_value += (
                            stats.get('total_goals', 0) * 2 +
                            stats.get('total_assists', 0) * 1
                        )
                    elif sport == 'BADMINTON':
                        sort_value += stats.get('sets_won', 0) * 1
                
                # Only include players with some activity
                if stats.get('matches_played', 0) > 0:
                    leaderboard.append({
                        'player_id': str(player.id),
                        'player_name': player.full_name,
                        'profile_picture': player.profile_picture.url if player.profile_picture else None,
                        'performance_score': sort_value,
                        **stats
                    })
            except Exception as e:
                continue
        
        # Sort by performance score (descending)
        leaderboard.sort(key=lambda x: x['performance_score'], reverse=True)
        
        # Add rankings
        for i, entry in enumerate(leaderboard[:limit], 1):
            entry['rank'] = i
        
        return leaderboard[:limit]
    
    @staticmethod
    def get_player_rankings(player_id: str, sport: str) -> Dict[str, Any]:
        """
        Get a player's ranking in a specific sport.
        
        Args:
            player_id: UUID of the player
            sport: 'FUTSAL' or 'BADMINTON'
            
        Returns:
            Dictionary with ranking information
        """
        leaderboard = PlayerStatisticsService.get_sport_leaderboard(sport, 'overall', 1000)
        
        player_entry = None
        for entry in leaderboard:
            if entry['player_id'] == player_id:
                player_entry = entry
                break
        
        if not player_entry:
            return {
                'ranking': 0,
                'total_players': len(leaderboard),
                'percentile': 0.0
            }
        
        ranking = player_entry['rank']
        total_players = len(leaderboard)
        percentile = ((total_players - ranking + 1) / total_players) * 100 if total_players > 0 else 0.0
        
        return {
            'ranking': ranking,
            'total_players': total_players,
            'percentile': percentile
        }