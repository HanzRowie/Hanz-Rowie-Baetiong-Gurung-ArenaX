"""
Match Remarks API
Organizers can add penalties, cards, and custom remarks to matches.
These serve as reference notes when entering final match scores.
"""
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Match, Tournament, MatchRemark


class MatchRemarkSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True, allow_null=True)
    remark_type_display = serializers.CharField(source='get_remark_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = MatchRemark
        fields = [
            'id', 'remark_type', 'remark_type_display', 'severity', 'severity_display',
            'team', 'team_name', 'player_name', 'minute',
            'title', 'description', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


def _check_organizer(request, match):
    """Returns True if the request user is the tournament organizer."""
    return (
        request.user.is_authenticated
        and request.user.role == 'ORGANIZER'
        and match.tournament.organizer == request.user
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def match_remarks(request, tournament_id, match_id):
    """
    GET  - List all remarks for a match
    POST - Create a new remark (organizer only)
    """
    tournament = get_object_or_404(Tournament, id=tournament_id)
    match = get_object_or_404(Match, id=match_id, tournament=tournament)

    if request.method == 'GET':
        remarks = match.remarks.select_related('created_by', 'team').all()
        serializer = MatchRemarkSerializer(remarks, many=True)
        return Response({
            'remarks': serializer.data,
            'counts': {
                'total': remarks.count(),
                'penalties': remarks.filter(remark_type='PENALTY').count(),
                'yellow_cards': remarks.filter(remark_type='YELLOW_CARD').count(),
                'red_cards': remarks.filter(remark_type='RED_CARD').count(),
            }
        })

    # POST - organizer only
    if not _check_organizer(request, match):
        return Response(
            {'error': 'Only the tournament organizer can add remarks'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = MatchRemarkSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(match=match, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def match_remark_detail(request, tournament_id, match_id, remark_id):
    """
    GET    - Retrieve a single remark
    PUT    - Update a remark (organizer only)
    DELETE - Delete a remark (organizer only)
    """
    tournament = get_object_or_404(Tournament, id=tournament_id)
    match = get_object_or_404(Match, id=match_id, tournament=tournament)
    remark = get_object_or_404(MatchRemark, id=remark_id, match=match)

    if request.method == 'GET':
        return Response(MatchRemarkSerializer(remark).data)

    if not _check_organizer(request, match):
        return Response(
            {'error': 'Only the tournament organizer can modify remarks'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'PUT':
        serializer = MatchRemarkSerializer(remark, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    remark.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def remark_options(request):
    """Return the available dropdown options for remark types and severities."""
    return Response({
        'remark_types': [{'value': k, 'label': v} for k, v in MatchRemark.REMARK_TYPES],
        'severities': [{'value': k, 'label': v} for k, v in MatchRemark.SEVERITY_CHOICES],
    })
