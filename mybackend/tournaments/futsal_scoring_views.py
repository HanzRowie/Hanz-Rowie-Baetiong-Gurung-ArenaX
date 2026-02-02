"""
Futsal Scoring Views

Simple endpoints for futsal match scoring with goal scorers and assists.
Keeps it minimal for UI testing while supporting the enhanced features.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Tournament, Match
from teams.models import FutsalScore, FutsalPlayerStat, FutsalGoal
from accounts.models import CustomUser


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_futsal_match_score(request, tournament_id, match_id):
    """
    Record futsal match score with basic goal scorer and assist tracking
    
    Expected data format:
    {
        "home_team_data": {
            "goals": 3,
            "player_stats": [
                {
                    "player_id": "uuid",
                    "goals": 1,
                    "assists": 0,
                    "minutes_played": 90
                }
            ],
            "goal_details": [
                {
                    "scorer_id": "uuid",
                    "assist_by_id": "uuid",  // optional
                    "minute": 15,
                    "goal_type": "REGULAR"
                }
            ]
        },
        "away_team_data": { ... }
    }
    """
    
    # Check authorization
    if request.user.role != 'ORGANIZER':
        return Response(
            {'error': 'Only organizers can record match scores'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        tournament = get_object_or_404(Tournament, id=tournament_id)
        match = get_object_or_404(Match, id=match_id, tournament=tournament)
        
        # Verify organizer owns the tournament
        if tournament.organizer != request.user:
            return Response(
                {'error': 'You can only score matches in your own tournaments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if match can be scored
        if match.status == 'COMPLETED':
            return Response(
                {'error': 'Cannot update scores for completed matches'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate sport type
        if tournament.sport_type != 'FUTSAL':
            return Response(
                {'error': 'This endpoint is only for futsal matches'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate teams are assigned
        if not match.team1 or not match.team2:
            return Response(
                {'error': 'Both teams must be assigned before scoring'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = request.data
        home_team_data = data.get('home_team_data', {})
        away_team_data = data.get('away_team_data', {})
        
        # Basic validation
        if 'goals' not in home_team_data or 'goals' not in away_team_data:
            return Response(
                {'error': 'Both teams must have goals specified'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Record team scores
            home_score = record_team_futsal_score(match, match.team1, home_team_data)
            away_score = record_team_futsal_score(match, match.team2, away_team_data)
            
            # Update match scores
            match.player1_score = home_team_data['goals']
            match.player2_score = away_team_data['goals']
            
            # Determine winner
            if home_team_data['goals'] > away_team_data['goals']:
                match.winning_team = match.team1
            elif away_team_data['goals'] > home_team_data['goals']:
                match.winning_team = match.team2
            # No winner for draws
            
            match.status = 'COMPLETED'
            match.save()
            
            # Try to advance winner to next round
            try:
                from teams.services.match_scorer import MatchScorer
                MatchScorer._advance_winner_to_next_round(match)
            except Exception as e:
                print(f"Warning: Could not advance winner: {e}")
            
            return Response({
                'success': True,
                'message': 'Match score recorded successfully',
                'match': {
                    'id': str(match.id),
                    'status': match.status,
                    'team1_score': match.player1_score,
                    'team2_score': match.player2_score,
                    'winning_team': {
                        'id': str(match.winning_team.id),
                        'name': match.winning_team.name
                    } if match.winning_team else None
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response(
            {'error': f'Failed to record match score: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def record_team_futsal_score(match, team, team_data):
    """Record futsal score for a single team"""
    
    # Create or update team score
    futsal_score, created = FutsalScore.objects.get_or_create(
        match=match,
        team=team,
        defaults={
            'goals': team_data['goals'],
            'shots_on_target': team_data.get('shots_on_target', 0),
            'shots_off_target': team_data.get('shots_off_target', 0),
            'possession_percentage': team_data.get('possession_percentage', 50.0),
            'fouls': team_data.get('fouls', 0),
            'yellow_cards': team_data.get('yellow_cards', 0),
            'red_cards': team_data.get('red_cards', 0)
        }
    )
    
    if not created:
        futsal_score.goals = team_data['goals']
        futsal_score.shots_on_target = team_data.get('shots_on_target', 0)
        futsal_score.shots_off_target = team_data.get('shots_off_target', 0)
        futsal_score.possession_percentage = team_data.get('possession_percentage', 50.0)
        futsal_score.fouls = team_data.get('fouls', 0)
        futsal_score.yellow_cards = team_data.get('yellow_cards', 0)
        futsal_score.red_cards = team_data.get('red_cards', 0)
        futsal_score.save()
    
    # Clear existing player stats and goals
    futsal_score.player_stats.all().delete()
    futsal_score.goal_details.all().delete()
    
    # Create player stats
    for stat_data in team_data.get('player_stats', []):
        if stat_data.get('player_id'):
            try:
                player = CustomUser.objects.get(id=stat_data['player_id'])
                FutsalPlayerStat.objects.create(
                    futsal_score=futsal_score,
                    player=player,
                    goals=stat_data.get('goals', 0),
                    assists=stat_data.get('assists', 0),
                    minutes_played=stat_data.get('minutes_played', 0),
                    is_starter=stat_data.get('is_starter', True),
                    shots_on_target=stat_data.get('shots_on_target', 0),
                    shots_off_target=stat_data.get('shots_off_target', 0),
                    tackles=stat_data.get('tackles', 0),
                    interceptions=stat_data.get('interceptions', 0),
                    clearances=stat_data.get('clearances', 0),
                    yellow_cards=stat_data.get('yellow_cards', 0),
                    red_cards=stat_data.get('red_cards', 0),
                    fouls_committed=stat_data.get('fouls_committed', 0),
                    fouls_suffered=stat_data.get('fouls_suffered', 0),
                    passes_completed=stat_data.get('passes_completed', 0),
                    passes_attempted=stat_data.get('passes_attempted', 0)
                )
            except CustomUser.DoesNotExist:
                continue
    
    # Create goal details
    for goal_data in team_data.get('goal_details', []):
        if goal_data.get('scorer_id'):
            try:
                scorer = CustomUser.objects.get(id=goal_data['scorer_id'])
                assist_by = None
                if goal_data.get('assist_by_id'):
                    try:
                        assist_by = CustomUser.objects.get(id=goal_data['assist_by_id'])
                    except CustomUser.DoesNotExist:
                        pass
                
                FutsalGoal.objects.create(
                    futsal_score=futsal_score,
                    scorer=scorer,
                    assist_by=assist_by,
                    minute=goal_data.get('minute', 1),
                    goal_type=goal_data.get('goal_type', 'REGULAR'),
                    description=goal_data.get('description', '')
                )
            except CustomUser.DoesNotExist:
                continue
    
    return futsal_score


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_match_details(request, tournament_id, match_id):
    """Get detailed match information including futsal scores if available"""
    
    try:
        tournament = get_object_or_404(Tournament, id=tournament_id)
        match = get_object_or_404(Match, id=match_id, tournament=tournament)
        
        match_data = {
            'id': str(match.id),
            'tournament': {
                'id': str(tournament.id),
                'title': tournament.title,
                'sport_type': tournament.sport_type,
                'registration_type': tournament.registration_type
            },
            'round_number': match.round_number,
            'match_number': match.match_number,
            'status': match.status,
            'team1': {
                'id': str(match.team1.id),
                'name': match.team1.name
            } if match.team1 else None,
            'team2': {
                'id': str(match.team2.id),
                'name': match.team2.name
            } if match.team2 else None,
            'team1_score': match.player1_score,
            'team2_score': match.player2_score,
            'winning_team': {
                'id': str(match.winning_team.id),
                'name': match.winning_team.name
            } if match.winning_team else None,
            'scheduled_time': match.scheduled_time,
            'notes': match.notes
        }
        
        # Add team rosters for organizers (for match scoring)
        if request.user.role == 'ORGANIZER' and tournament.organizer == request.user:
            from teams.models import TeamMembership
            
            if match.team1:
                team1_members = TeamMembership.objects.filter(
                    team=match.team1
                ).select_related('player')
                match_data['team1_members'] = [
                    {
                        'id': str(m.player.id),
                        'full_name': m.player.full_name,
                        'email': m.player.email
                    }
                    for m in team1_members
                ]
            
            if match.team2:
                team2_members = TeamMembership.objects.filter(
                    team=match.team2
                ).select_related('player')
                match_data['team2_members'] = [
                    {
                        'id': str(m.player.id),
                        'full_name': m.player.full_name,
                        'email': m.player.email
                    }
                    for m in team2_members
                ]
        
        # Add futsal scores if available
        if tournament.sport_type == 'FUTSAL' and match.status == 'COMPLETED':
            futsal_scores = []
            for futsal_score in match.futsal_scores.all():
                score_data = {
                    'team': {
                        'id': str(futsal_score.team.id),
                        'name': futsal_score.team.name
                    },
                    'goals': futsal_score.goals,
                    'shots_on_target': futsal_score.shots_on_target,
                    'shots_off_target': futsal_score.shots_off_target,
                    'possession_percentage': float(futsal_score.possession_percentage) if futsal_score.possession_percentage else 50.0,
                    'fouls': futsal_score.fouls,
                    'yellow_cards': futsal_score.yellow_cards,
                    'red_cards': futsal_score.red_cards,
                    'player_stats': [],
                    'goal_details': []
                }
                
                # Add player stats
                for stat in futsal_score.player_stats.all():
                    score_data['player_stats'].append({
                        'player': {
                            'id': str(stat.player.id),
                            'name': stat.player.full_name
                        },
                        'goals': stat.goals,
                        'assists': stat.assists,
                        'minutes_played': stat.minutes_played,
                        'is_starter': stat.is_starter
                    })
                
                # Add goal details
                for goal in futsal_score.goal_details.all():
                    score_data['goal_details'].append({
                        'scorer': {
                            'id': str(goal.scorer.id),
                            'name': goal.scorer.full_name
                        },
                        'assist_by': {
                            'id': str(goal.assist_by.id),
                            'name': goal.assist_by.full_name
                        } if goal.assist_by else None,
                        'minute': goal.minute,
                        'goal_type': goal.goal_type,
                        'description': goal.description
                    })
                
                futsal_scores.append(score_data)
            
            match_data['futsal_scores'] = futsal_scores
        
        return Response({
            'success': True,
            'data': match_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get match details: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )