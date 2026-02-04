"""
Player Statistics Views
Provides comprehensive statistics and leaderboards for all players across different sports.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Avg, Q, F, Case, When, IntegerField, FloatField
from django.db.models.functions import Coalesce
from .models import CustomUser
from teams.models import FutsalPlayerStat, FutsalScore, BadmintonSet, Team
from tournaments.models import Match, Tournament, TournamentRegistration


@api_view(['GET'])
@permission_classes([AllowAny])
def get_global_player_statistics(request):
    """
    Get comprehensive global player statistics across all sports.
    Accessible to all users without authentication.
    """
    sport = request.query_params.get('sport', None)  # 'FUTSAL' or 'BADMINTON' or None for all
    
    try:
        # Base queryset for players
        players = CustomUser.objects.filter(role='PLAYER')
        
        if sport == 'FUTSAL':
            stats = get_futsal_global_statistics(players)
        elif sport == 'BADMINTON':
            stats = get_badminton_global_statistics(players)
        else:
            # Combined statistics for all sports
            futsal_stats = get_futsal_global_statistics(players)
            badminton_stats = get_badminton_global_statistics(players)
            
            stats = {
                'overall': {
                    'total_players': players.count(),
                    'total_matches': futsal_stats['overall']['total_matches'] + badminton_stats['overall']['total_matches'],
                    'active_players': futsal_stats['overall']['active_players'] + badminton_stats['overall']['active_players'],
                },
                'futsal': futsal_stats,
                'badminton': badminton_stats
            }
        
        return Response(stats, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch statistics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def get_futsal_global_statistics(players):
    """Calculate global Futsal statistics"""
    
    # Get all futsal player stats
    futsal_stats = FutsalPlayerStat.objects.select_related('player', 'futsal_score__match__tournament')
    
    # Overall statistics
    total_goals = futsal_stats.aggregate(total=Sum('goals'))['total'] or 0
    total_assists = futsal_stats.aggregate(total=Sum('assists'))['total'] or 0
    total_matches = futsal_stats.values('futsal_score__match').distinct().count()
    
    # Active players (players who have played at least one match)
    active_players = futsal_stats.values('player').distinct().count()
    
    # Average statistics
    avg_goals_per_match = round(total_goals / total_matches, 2) if total_matches > 0 else 0
    avg_assists_per_match = round(total_assists / total_matches, 2) if total_matches > 0 else 0
    
    # Player aggregations for leaderboards
    player_stats = futsal_stats.values('player').annotate(
        total_goals=Sum('goals'),
        total_assists=Sum('assists'),
        total_matches=Count('futsal_score__match', distinct=True),
        total_minutes=Sum('minutes_played'),
        total_shots=Sum(F('shots_on_target') + F('shots_off_target')),
        shots_on_target=Sum('shots_on_target'),
        yellow_cards=Sum('yellow_cards'),
        red_cards=Sum('red_cards')
    ).order_by('-total_goals')
    
    # Top goal scorers
    top_scorers = []
    for idx, stat in enumerate(player_stats[:10], 1):
        try:
            player = CustomUser.objects.get(id=stat['player'])
            avg_goals = round(stat['total_goals'] / stat['total_matches'], 2) if stat['total_matches'] > 0 else 0
            
            top_scorers.append({
                'rank': idx,
                'player_id': str(player.id),
                'player_name': player.full_name,
                'profile_picture': player.profile_picture.url if player.profile_picture else None,
                'total_goals': stat['total_goals'],
                'total_matches': stat['total_matches'],
                'avg_goals_per_match': avg_goals,
                'total_assists': stat['total_assists'],
                'total_minutes': stat['total_minutes'] or 0,
            })
        except CustomUser.DoesNotExist:
            continue
    
    # Top assist providers
    top_assists = []
    assist_stats = player_stats.order_by('-total_assists')[:10]
    for idx, stat in enumerate(assist_stats, 1):
        try:
            player = CustomUser.objects.get(id=stat['player'])
            avg_assists = round(stat['total_assists'] / stat['total_matches'], 2) if stat['total_matches'] > 0 else 0
            
            top_assists.append({
                'rank': idx,
                'player_id': str(player.id),
                'player_name': player.full_name,
                'profile_picture': player.profile_picture.url if player.profile_picture else None,
                'total_assists': stat['total_assists'],
                'total_matches': stat['total_matches'],
                'avg_assists_per_match': avg_assists,
                'total_goals': stat['total_goals'],
            })
        except CustomUser.DoesNotExist:
            continue
    
    # Most matches played
    most_matches = []
    match_stats = player_stats.order_by('-total_matches')[:10]
    for idx, stat in enumerate(match_stats, 1):
        try:
            player = CustomUser.objects.get(id=stat['player'])
            
            most_matches.append({
                'rank': idx,
                'player_id': str(player.id),
                'player_name': player.full_name,
                'profile_picture': player.profile_picture.url if player.profile_picture else None,
                'total_matches': stat['total_matches'],
                'total_goals': stat['total_goals'],
                'total_assists': stat['total_assists'],
                'total_minutes': stat['total_minutes'] or 0,
            })
        except CustomUser.DoesNotExist:
            continue
    
    # Best goal contribution (goals + assists)
    best_contribution = []
    for stat in player_stats:
        stat['goal_contribution'] = stat['total_goals'] + stat['total_assists']
    
    contribution_stats = sorted(player_stats, key=lambda x: x['goal_contribution'], reverse=True)[:10]
    for idx, stat in enumerate(contribution_stats, 1):
        try:
            player = CustomUser.objects.get(id=stat['player'])
            
            best_contribution.append({
                'rank': idx,
                'player_id': str(player.id),
                'player_name': player.full_name,
                'profile_picture': player.profile_picture.url if player.profile_picture else None,
                'goal_contribution': stat['goal_contribution'],
                'total_goals': stat['total_goals'],
                'total_assists': stat['total_assists'],
                'total_matches': stat['total_matches'],
            })
        except CustomUser.DoesNotExist:
            continue
    
    return {
        'overall': {
            'total_matches': total_matches,
            'total_goals': total_goals,
            'total_assists': total_assists,
            'avg_goals_per_match': avg_goals_per_match,
            'avg_assists_per_match': avg_assists_per_match,
            'active_players': active_players,
        },
        'leaderboards': {
            'top_scorers': top_scorers,
            'top_assists': top_assists,
            'most_matches': most_matches,
            'best_contribution': best_contribution,
        }
    }


def get_badminton_global_statistics(players):
    """Calculate global Badminton statistics"""
    
    # Get all badminton matches
    badminton_matches = Match.objects.filter(
        tournament__sport_type='BADMINTON',
        status='COMPLETED'
    ).select_related('tournament', 'player1', 'player2', 'winner')
    
    total_matches = badminton_matches.count()
    
    # Get unique players who have played badminton
    player_ids = set()
    for match in badminton_matches:
        if match.player1:
            player_ids.add(match.player1.id)
        if match.player2:
            player_ids.add(match.player2.id)
    
    active_players = len(player_ids)
    
    # Calculate player statistics
    player_stats = {}
    
    for match in badminton_matches:
        # Process player1
        if match.player1:
            if match.player1.id not in player_stats:
                player_stats[match.player1.id] = {
                    'player': match.player1,
                    'matches_played': 0,
                    'matches_won': 0,
                    'total_points_scored': 0,
                    'total_points_conceded': 0,
                    'sets_won': 0,
                    'sets_lost': 0,
                }
            
            player_stats[match.player1.id]['matches_played'] += 1
            if match.winner and match.winner.id == match.player1.id:
                player_stats[match.player1.id]['matches_won'] += 1
            
            # Calculate points from sets
            sets = match.badminton_sets.all()
            for set_obj in sets:
                player_stats[match.player1.id]['total_points_scored'] += set_obj.home_score
                player_stats[match.player1.id]['total_points_conceded'] += set_obj.away_score
                if set_obj.home_score > set_obj.away_score:
                    player_stats[match.player1.id]['sets_won'] += 1
                else:
                    player_stats[match.player1.id]['sets_lost'] += 1
        
        # Process player2
        if match.player2:
            if match.player2.id not in player_stats:
                player_stats[match.player2.id] = {
                    'player': match.player2,
                    'matches_played': 0,
                    'matches_won': 0,
                    'total_points_scored': 0,
                    'total_points_conceded': 0,
                    'sets_won': 0,
                    'sets_lost': 0,
                }
            
            player_stats[match.player2.id]['matches_played'] += 1
            if match.winner and match.winner.id == match.player2.id:
                player_stats[match.player2.id]['matches_won'] += 1
            
            # Calculate points from sets
            sets = match.badminton_sets.all()
            for set_obj in sets:
                player_stats[match.player2.id]['total_points_scored'] += set_obj.away_score
                player_stats[match.player2.id]['total_points_conceded'] += set_obj.home_score
                if set_obj.away_score > set_obj.home_score:
                    player_stats[match.player2.id]['sets_won'] += 1
                else:
                    player_stats[match.player2.id]['sets_lost'] += 1
    
    # Convert to list and calculate win rates
    player_list = []
    for player_id, stats in player_stats.items():
        win_rate = round((stats['matches_won'] / stats['matches_played']) * 100, 1) if stats['matches_played'] > 0 else 0
        avg_points = round(stats['total_points_scored'] / stats['matches_played'], 1) if stats['matches_played'] > 0 else 0
        
        player_list.append({
            'player_id': str(player_id),
            'player': stats['player'],
            'matches_played': stats['matches_played'],
            'matches_won': stats['matches_won'],
            'win_rate': win_rate,
            'total_points_scored': stats['total_points_scored'],
            'avg_points_per_match': avg_points,
            'sets_won': stats['sets_won'],
            'sets_lost': stats['sets_lost'],
        })
    
    # Top players by wins
    top_winners = sorted(player_list, key=lambda x: x['matches_won'], reverse=True)[:10]
    top_winners_formatted = []
    for idx, stat in enumerate(top_winners, 1):
        top_winners_formatted.append({
            'rank': idx,
            'player_id': stat['player_id'],
            'player_name': stat['player'].full_name,
            'profile_picture': stat['player'].profile_picture.url if stat['player'].profile_picture else None,
            'matches_won': stat['matches_won'],
            'total_matches': stat['matches_played'],  # Changed from matches_played to total_matches
            'win_rate': stat['win_rate'],
        })
    
    # Top players by win rate (minimum 5 matches)
    qualified_players = [p for p in player_list if p['matches_played'] >= 5]
    top_win_rate = sorted(qualified_players, key=lambda x: x['win_rate'], reverse=True)[:10]
    top_win_rate_formatted = []
    for idx, stat in enumerate(top_win_rate, 1):
        top_win_rate_formatted.append({
            'rank': idx,
            'player_id': stat['player_id'],
            'player_name': stat['player'].full_name,
            'profile_picture': stat['player'].profile_picture.url if stat['player'].profile_picture else None,
            'win_rate': stat['win_rate'],
            'matches_won': stat['matches_won'],
            'total_matches': stat['matches_played'],  # Changed from matches_played to total_matches
        })
    
    # Most matches played
    most_matches = sorted(player_list, key=lambda x: x['matches_played'], reverse=True)[:10]
    most_matches_formatted = []
    for idx, stat in enumerate(most_matches, 1):
        most_matches_formatted.append({
            'rank': idx,
            'player_id': stat['player_id'],
            'player_name': stat['player'].full_name,
            'profile_picture': stat['player'].profile_picture.url if stat['player'].profile_picture else None,
            'total_matches': stat['matches_played'],  # Changed from matches_played to total_matches
            'matches_won': stat['matches_won'],
            'win_rate': stat['win_rate'],
        })
    
    # Best point scorers
    top_scorers = sorted(player_list, key=lambda x: x['total_points_scored'], reverse=True)[:10]
    top_scorers_formatted = []
    for idx, stat in enumerate(top_scorers, 1):
        top_scorers_formatted.append({
            'rank': idx,
            'player_id': stat['player_id'],
            'player_name': stat['player'].full_name,
            'profile_picture': stat['player'].profile_picture.url if stat['player'].profile_picture else None,
            'total_points_scored': stat['total_points_scored'],
            'avg_points_per_match': stat['avg_points_per_match'],
            'total_matches': stat['matches_played'],  # Changed from matches_played to total_matches
        })
    
    return {
        'overall': {
            'total_matches': total_matches,
            'active_players': active_players,
            'total_sets_played': sum(p['sets_won'] + p['sets_lost'] for p in player_list),
        },
        'leaderboards': {
            'top_winners': top_winners_formatted,
            'top_win_rate': top_win_rate_formatted,
            'most_matches': most_matches_formatted,
            'top_scorers': top_scorers_formatted,
        }
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def get_player_detailed_statistics(request, player_id=None):
    """
    Get detailed statistics for a specific player.
    If no player_id provided, use authenticated user.
    """
    if player_id:
        try:
            player = CustomUser.objects.get(id=player_id, role='PLAYER')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Player not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        player = request.user
    
    # Get Futsal statistics
    futsal_stats = get_player_futsal_stats(player)
    
    # Get Badminton statistics
    badminton_stats = get_player_badminton_stats(player)
    
    return Response({
        'player': {
            'id': str(player.id),
            'name': player.full_name,
            'profile_picture': player.profile_picture.url if player.profile_picture else None,
            'skill_level': player.skill_level,
            'location': player.location,
        },
        'futsal': futsal_stats,
        'badminton': badminton_stats,
    }, status=status.HTTP_200_OK)


def get_player_futsal_stats(player):
    """Get detailed Futsal statistics for a player"""
    stats = FutsalPlayerStat.objects.filter(player=player).aggregate(
        total_goals=Sum('goals'),
        total_assists=Sum('assists'),
        total_matches=Count('futsal_score__match', distinct=True),
        total_minutes=Sum('minutes_played'),
        total_shots_on_target=Sum('shots_on_target'),
        total_shots_off_target=Sum('shots_off_target'),
        total_yellow_cards=Sum('yellow_cards'),
        total_red_cards=Sum('red_cards'),
    )
    
    total_goals = stats['total_goals'] or 0
    total_assists = stats['total_assists'] or 0
    total_matches = stats['total_matches'] or 0
    total_minutes = stats['total_minutes'] or 0
    
    avg_goals = round(total_goals / total_matches, 2) if total_matches > 0 else 0
    avg_assists = round(total_assists / total_matches, 2) if total_matches > 0 else 0
    
    return {
        'total_matches': total_matches,
        'total_goals': total_goals,
        'total_assists': total_assists,
        'avg_goals_per_match': avg_goals,
        'avg_assists_per_match': avg_assists,
        'goal_contribution': total_goals + total_assists,
        'total_minutes': total_minutes,
        'shots_on_target': stats['total_shots_on_target'] or 0,
        'shots_off_target': stats['total_shots_off_target'] or 0,
        'yellow_cards': stats['total_yellow_cards'] or 0,
        'red_cards': stats['total_red_cards'] or 0,
    }


def get_player_badminton_stats(player):
    """Get detailed Badminton statistics for a player"""
    matches_as_p1 = Match.objects.filter(
        tournament__sport_type='BADMINTON',
        player1=player,
        status='COMPLETED'
    )
    
    matches_as_p2 = Match.objects.filter(
        tournament__sport_type='BADMINTON',
        player2=player,
        status='COMPLETED'
    )
    
    total_matches = matches_as_p1.count() + matches_as_p2.count()
    matches_won = Match.objects.filter(
        tournament__sport_type='BADMINTON',
        winner=player,
        status='COMPLETED'
    ).count()
    
    win_rate = round((matches_won / total_matches) * 100, 1) if total_matches > 0 else 0
    
    return {
        'total_matches': total_matches,
        'matches_won': matches_won,
        'matches_lost': total_matches - matches_won,
        'win_rate': win_rate,
    }
