"""
Live Match Event Management API
Handles real-time event creation for futsal matches (goals, cards, fouls, etc.)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

from .models import Match, Tournament
from teams.models import (
    FutsalScore, FutsalPlayerStat, FutsalGoal, FutsalCard,
    Team, TeamMembership
)
from accounts.models import CustomUser
from rest_framework import serializers


# Serializers
class FutsalGoalSerializer(serializers.ModelSerializer):
    scorer_name = serializers.CharField(source='scorer.full_name', read_only=True)
    assist_by_name = serializers.CharField(source='assist_by.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = FutsalGoal
        fields = [
            'id', 'scorer', 'scorer_name', 'assist_by', 'assist_by_name',
            'minute', 'goal_type', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FutsalCardSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.full_name', read_only=True)
    
    class Meta:
        model = FutsalCard
        fields = [
            'id', 'player', 'player_name', 'card_type', 'reason',
            'minute', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MatchEventTimelineSerializer(serializers.Serializer):
    """Unified timeline of all match events"""
    id = serializers.UUIDField()
    event_type = serializers.CharField()  # 'GOAL', 'YELLOW_CARD', 'RED_CARD'
    team_id = serializers.UUIDField()
    team_name = serializers.CharField()
    player_id = serializers.UUIDField()
    player_name = serializers.CharField()
    minute = serializers.IntegerField()
    description = serializers.CharField()
    created_at = serializers.DateTimeField()
    
    # Goal-specific fields
    goal_type = serializers.CharField(required=False, allow_null=True)
    assist_by_id = serializers.UUIDField(required=False, allow_null=True)
    assist_by_name = serializers.CharField(required=False, allow_null=True)
    
    # Card-specific fields
    card_type = serializers.CharField(required=False, allow_null=True)
    card_reason = serializers.CharField(required=False, allow_null=True)


class MatchEventViewSet(viewsets.ViewSet):
    """
    ViewSet for managing live match events (goals, cards, fouls)
    """
    permission_classes = [IsAuthenticated]
    
    def _check_organizer_permission(self, request, match):
        """Check if user is the tournament organizer"""
        if request.user.role != 'ORGANIZER':
            return False
        return match.tournament.organizer == request.user
    
    def _get_or_create_futsal_score(self, match, team):
        """Get or create FutsalScore for a team in a match"""
        futsal_score, created = FutsalScore.objects.get_or_create(
            match=match,
            team=team,
            defaults={
                'goals': 0,
                'shots_on_target': 0,
                'shots_off_target': 0,
                'fouls': 0,
                'yellow_cards': 0,
                'red_cards': 0
            }
        )
        return futsal_score
    
    def _update_player_stats(self, futsal_score, player, stat_type, increment=1):
        """Update or create player stats"""
        player_stat, created = FutsalPlayerStat.objects.get_or_create(
            futsal_score=futsal_score,
            player=player,
            defaults={
                'goals': 0,
                'assists': 0,
                'minutes_played': 0,
                'is_starter': True
            }
        )
        
        if stat_type == 'goal':
            player_stat.goals += increment
        elif stat_type == 'assist':
            player_stat.assists += increment
        elif stat_type == 'yellow_card':
            player_stat.yellow_cards += increment
        elif stat_type == 'red_card':
            player_stat.red_cards += increment
        
        player_stat.save()
        return player_stat
    
    def _update_match_score(self, match):
        """Update match team scores based on goals"""
        team1_goals = FutsalGoal.objects.filter(
            futsal_score__match=match,
            futsal_score__team=match.team1
        ).count()
        
        team2_goals = FutsalGoal.objects.filter(
            futsal_score__match=match,
            futsal_score__team=match.team2
        ).count()
        
        # Update match scores (using player1_score and player2_score fields)
        match.player1_score = team1_goals
        match.player2_score = team2_goals
        
        # Update match status
        if match.status == 'SCHEDULED':
            match.status = 'IN_PROGRESS'
            match.actual_start_time = timezone.now()
        
        match.save()
        
        # Update FutsalScore goals count
        if match.team1:
            futsal_score1 = self._get_or_create_futsal_score(match, match.team1)
            futsal_score1.goals = team1_goals
            futsal_score1.save()
        
        if match.team2:
            futsal_score2 = self._get_or_create_futsal_score(match, match.team2)
            futsal_score2.goals = team2_goals
            futsal_score2.save()
    
    @action(detail=True, methods=['post'], url_path='add-goal')
    def add_goal(self, request, pk=None):
        """
        Add a goal event to the match
        
        Expected payload:
        {
            "team_id": "uuid",
            "scorer_id": "uuid",
            "assist_by_id": "uuid" (optional),
            "minute": 45,
            "goal_type": "REGULAR",
            "description": "Great shot from outside the box"
        }
        """
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can add match events'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Prevent editing completed matches
        if match.status == 'COMPLETED':
            return Response(
                {'error': 'This match has already been completed and cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate match is futsal
        if match.tournament.sport_type != 'FUTSAL':
            return Response(
                {'error': 'This endpoint is only for futsal matches'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data
        team_id = request.data.get('team_id')
        scorer_id = request.data.get('scorer_id')
        assist_by_id = request.data.get('assist_by_id')
        minute = request.data.get('minute', 0)
        goal_type = request.data.get('goal_type', 'REGULAR')
        description = request.data.get('description', '')
        
        # Validate team
        team = get_object_or_404(Team, pk=team_id)
        if team not in [match.team1, match.team2]:
            return Response(
                {'error': 'Team is not part of this match'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate scorer
        scorer = get_object_or_404(CustomUser, pk=scorer_id)
        
        # Validate assist (if provided)
        assist_by = None
        if assist_by_id:
            assist_by = get_object_or_404(CustomUser, pk=assist_by_id)
        
        try:
            with transaction.atomic():
                # Get or create futsal score
                futsal_score = self._get_or_create_futsal_score(match, team)
                
                # Create goal event
                goal = FutsalGoal.objects.create(
                    futsal_score=futsal_score,
                    scorer=scorer,
                    assist_by=assist_by,
                    minute=minute,
                    goal_type=goal_type,
                    description=description
                )
                
                # Update player stats
                self._update_player_stats(futsal_score, scorer, 'goal')
                if assist_by:
                    self._update_player_stats(futsal_score, assist_by, 'assist')
                
                # Update match score
                self._update_match_score(match)
                
                serializer = FutsalGoalSerializer(goal)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to add goal: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='add-card')
    def add_card(self, request, pk=None):
        """
        Add a card event to the match
        
        Expected payload:
        {
            "team_id": "uuid",
            "player_id": "uuid",
            "card_type": "YELLOW",
            "reason": "UNSPORTING_BEHAVIOR",
            "minute": 30,
            "description": "Rough tackle"
        }
        """
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can add match events'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Prevent editing completed matches
        if match.status == 'COMPLETED':
            return Response(
                {'error': 'This match has already been completed and cannot be edited.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate match is futsal
        if match.tournament.sport_type != 'FUTSAL':
            return Response(
                {'error': 'This endpoint is only for futsal matches'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data
        team_id = request.data.get('team_id')
        player_id = request.data.get('player_id')
        card_type = request.data.get('card_type', 'YELLOW')
        reason = request.data.get('reason', 'UNSPORTING_BEHAVIOR')
        minute = request.data.get('minute', 0)
        description = request.data.get('description', '')
        
        # Validate team
        team = get_object_or_404(Team, pk=team_id)
        if team not in [match.team1, match.team2]:
            return Response(
                {'error': 'Team is not part of this match'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate player
        player = get_object_or_404(CustomUser, pk=player_id)
        
        try:
            with transaction.atomic():
                # Get or create futsal score
                futsal_score = self._get_or_create_futsal_score(match, team)
                
                # Create card event
                card = FutsalCard.objects.create(
                    futsal_score=futsal_score,
                    player=player,
                    card_type=card_type,
                    reason=reason,
                    minute=minute,
                    description=description
                )
                
                # Update player stats
                if card_type == 'YELLOW':
                    self._update_player_stats(futsal_score, player, 'yellow_card')
                    futsal_score.yellow_cards += 1
                elif card_type == 'RED':
                    self._update_player_stats(futsal_score, player, 'red_card')
                    futsal_score.red_cards += 1
                
                futsal_score.save()
                
                # Update match status if needed
                if match.status == 'SCHEDULED':
                    match.status = 'IN_PROGRESS'
                    match.actual_start_time = timezone.now()
                    match.save()
                
                serializer = FutsalCardSerializer(card)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to add card: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='timeline')
    def get_timeline(self, request, pk=None):
        """
        Get unified timeline of all match events
        """
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can view match events'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        timeline = []
        
        # Get all goals
        goals = FutsalGoal.objects.filter(
            futsal_score__match=match
        ).select_related('scorer', 'assist_by', 'futsal_score__team').order_by('minute', 'created_at')
        
        for goal in goals:
            timeline.append({
                'id': str(goal.id),
                'event_type': 'GOAL',
                'team_id': str(goal.futsal_score.team.id),
                'team_name': goal.futsal_score.team.name,
                'player_id': str(goal.scorer.id),
                'player_name': goal.scorer.full_name,
                'minute': goal.minute,
                'description': goal.description or f'{goal.get_goal_type_display()}',
                'created_at': goal.created_at,
                'goal_type': goal.goal_type,
                'assist_by_id': str(goal.assist_by.id) if goal.assist_by else None,
                'assist_by_name': goal.assist_by.full_name if goal.assist_by else None
            })
        
        # Get all cards
        cards = FutsalCard.objects.filter(
            futsal_score__match=match
        ).select_related('player', 'futsal_score__team').order_by('minute', 'created_at')
        
        for card in cards:
            timeline.append({
                'id': str(card.id),
                'event_type': f'{card.card_type}_CARD',
                'team_id': str(card.futsal_score.team.id),
                'team_name': card.futsal_score.team.name,
                'player_id': str(card.player.id),
                'player_name': card.player.full_name,
                'minute': card.minute,
                'description': card.description or card.get_reason_display(),
                'created_at': card.created_at,
                'card_type': card.card_type,
                'card_reason': card.reason
            })
        
        # Sort by minute and created_at
        timeline.sort(key=lambda x: (x['minute'], x['created_at']))
        
        return Response(timeline, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], url_path='delete-goal/(?P<goal_id>[^/.]+)')
    def delete_goal(self, request, pk=None, goal_id=None):
        """Delete a goal event (undo)"""
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can delete match events'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        goal = get_object_or_404(FutsalGoal, pk=goal_id, futsal_score__match=match)
        
        try:
            with transaction.atomic():
                futsal_score = goal.futsal_score
                scorer = goal.scorer
                assist_by = goal.assist_by
                
                # Update player stats
                self._update_player_stats(futsal_score, scorer, 'goal', increment=-1)
                if assist_by:
                    self._update_player_stats(futsal_score, assist_by, 'assist', increment=-1)
                
                # Delete goal
                goal.delete()
                
                # Update match score
                self._update_match_score(match)
                
                return Response(
                    {'message': 'Goal deleted successfully'},
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            return Response(
                {'error': f'Failed to delete goal: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['delete'], url_path='delete-card/(?P<card_id>[^/.]+)')
    def delete_card(self, request, pk=None, card_id=None):
        """Delete a card event (undo)"""
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can delete match events'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        card = get_object_or_404(FutsalCard, pk=card_id, futsal_score__match=match)
        
        try:
            with transaction.atomic():
                futsal_score = card.futsal_score
                player = card.player
                card_type = card.card_type
                
                # Update player stats
                if card_type == 'YELLOW':
                    self._update_player_stats(futsal_score, player, 'yellow_card', increment=-1)
                    futsal_score.yellow_cards = max(0, futsal_score.yellow_cards - 1)
                elif card_type == 'RED':
                    self._update_player_stats(futsal_score, player, 'red_card', increment=-1)
                    futsal_score.red_cards = max(0, futsal_score.red_cards - 1)
                
                futsal_score.save()
                
                # Delete card
                card.delete()
                
                return Response(
                    {'message': 'Card deleted successfully'},
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            return Response(
                {'error': f'Failed to delete card: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='complete-match')
    def complete_match(self, request, pk=None):
        """Mark match as completed"""
        match = get_object_or_404(Match, pk=pk)
        
        # Check permissions
        if not self._check_organizer_permission(request, match):
            return Response(
                {'error': 'Only the tournament organizer can complete matches'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if match.status == 'COMPLETED':
            return Response(
                {'error': 'Match is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                match.status = 'COMPLETED'
                match.actual_end_time = timezone.now()
                
                # Determine winner based on tournament type
                if match.tournament.registration_type == 'TEAM':
                    # Team tournament - use player scores (which represent team scores)
                    if match.player1_score and match.player2_score:
                        if match.player1_score > match.player2_score:
                            match.winning_team = match.team1
                        elif match.player2_score > match.player1_score:
                            match.winning_team = match.team2
                else:
                    # Individual tournament
                    if match.player1_score and match.player2_score:
                        if match.player1_score > match.player2_score:
                            match.winner = match.player1
                        elif match.player2_score > match.player1_score:
                            match.winner = match.player2
                
                match.save()
                
                # Determine winner name for response
                winner_name = 'Draw'
                if match.tournament.registration_type == 'TEAM':
                    if match.winning_team:
                        winner_name = match.winning_team.name
                else:
                    if match.winner:
                        winner_name = match.winner.full_name
                
                return Response(
                    {
                        'message': 'Match completed successfully',
                        'winner': winner_name
                    },
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            return Response(
                {'error': f'Failed to complete match: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
