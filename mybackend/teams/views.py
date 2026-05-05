from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.http import Http404
from django.db.models import Q
from django.utils import timezone
from .models import Team, TeamMembership, Invitation, ActivityHistory, TeamJoinRequest
from .services import ActivityHistoryService, TeamManager, RoleManager, InvitationManager, MatchScorer, MatchNotFoundError, UnauthorizedScoringError, InvalidScoreError, MatchAlreadyScoredError
from tournaments.models import Match
from .serializers import (
    TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer, TeamListSerializer,
    TeamMembershipSerializer, InvitationSerializer, InvitationCreateSerializer,
    InvitationResponseSerializer, TeamMemberAddSerializer, TeamMemberRoleUpdateSerializer,
    OwnershipTransferSerializer, TeamJoinRequestSerializer, TeamJoinRequestCreateSerializer,
    TeamJoinRequestResponseSerializer
)
from accounts.decorators import role_required
from .error_handlers import team_error_handler
from .exceptions import TeamErrorMonitor, log_team_operation
import json


# Team CRUD Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
@team_error_handler('create_team')
def create_team(request):
    """
    Create a new team.
    
    Required fields:
    - name: Team name (must be unique)
    - sport_types: List of sports ['FUTSAL', 'BADMINTON']
    
    Optional fields:
    - max_size: Maximum team size (default: 15)
    """
    serializer = TeamCreateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create team using TeamManager service
    team = TeamManager.create_team(
        name=serializer.validated_data['name'],
        sport_types=serializer.validated_data['sport_types'],
        owner_id=str(request.user.id)
    )
    
    # Return created team data
    team_serializer = TeamSerializer(team)
    return Response({
        'success': True,
        'data': team_serializer.data,
        'message': f"Team '{team.name}' created successfully"
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required(['PLAYER', 'ORGANIZER', 'SYSTEM_ADMIN', 'VENUE_OWNER'])
@team_error_handler('list_teams')
def list_teams(request):
    """
    List teams with optional filtering.
    
    Query parameters:
    - sport: Filter by sport type ('FUTSAL', 'BADMINTON')
    - owner: Filter by owner (user ID)
    - member: Filter teams where user is a member
    - exclude_member: Exclude teams where user is a member (for discovery)
    - search: Search by team name
    - limit: Maximum number of results (default: 50)
    - offset: Number of results to skip (default: 0)
    """
    # Parse query parameters
    sport = request.GET.get('sport')
    owner_id = request.GET.get('owner')
    member_id = request.GET.get('member')
    exclude_member_id = request.GET.get('exclude_member')
    search = request.GET.get('search')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    
    # Start with active teams
    queryset = Team.objects.filter(is_active=True)
    
    # Apply filters
    if sport:
        if sport in ['FUTSAL', 'BADMINTON']:
            queryset = queryset.filter(sport_types__icontains=sport)
    
    if owner_id:
        queryset = queryset.filter(owner_id=owner_id)
    
    if member_id:
        # Handle 'me' as current user
        if member_id == 'me':
            member_id = request.user.id
        
        # Get teams where user is a member
        team_ids = TeamMembership.objects.filter(
            player_id=member_id,
            is_active=True
        ).values_list('team_id', flat=True)
        queryset = queryset.filter(id__in=team_ids)
    
    if exclude_member_id:
        # Handle 'me' as current user
        if exclude_member_id == 'me':
            exclude_member_id = request.user.id
        
        # Exclude teams where user is a member
        team_ids = TeamMembership.objects.filter(
            player_id=exclude_member_id,
            is_active=True
        ).values_list('team_id', flat=True)
        queryset = queryset.exclude(id__in=team_ids)
    
    if search:
        queryset = queryset.filter(name__icontains=search)
    
    # Apply pagination and optimize queries
    total_count = queryset.count()
    teams = queryset.select_related('owner').prefetch_related(
        'memberships__player'
    )[offset:offset + limit]
    
    # Serialize teams
    serializer = TeamListSerializer(teams, many=True)
    
    return Response({
        'success': True,
        'data': serializer.data,
        'pagination': {
            'total': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': offset + limit < total_count
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required(['PLAYER', 'ORGANIZER', 'SYSTEM_ADMIN', 'VENUE_OWNER'])
@team_error_handler('get_team')
def get_team(request, team_id):
    """
    Get detailed information about a specific team.
    """
    team = Team.objects.select_related('owner').prefetch_related(
        'memberships__player'
    ).get(id=team_id, is_active=True)
    
    serializer = TeamSerializer(team)
    return Response({
        'success': True,
        'data': serializer.data
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
@team_error_handler('update_team')
def update_team(request, team_id):
    """
    Update team information. Only team owner can update.
    
    Updatable fields:
    - name: Team name
    - sport_types: List of sports
    - max_size: Maximum team size
    """
    team = Team.objects.get(id=team_id, is_active=True)
    
    # Validate request data
    serializer = TeamUpdateSerializer(team, data=request.data, partial=True)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update team using TeamManager service
    updated_team = TeamManager.update_team(
        team_id=str(team_id),
        updates=serializer.validated_data,
        updated_by_id=str(request.user.id)
    )
    
    # Return updated team data
    team_serializer = TeamSerializer(updated_team)
    return Response({
        'success': True,
        'data': team_serializer.data,
        'message': 'Team updated successfully'
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
@team_error_handler('delete_team')
def delete_team(request, team_id):
    """
    Delete (deactivate) a team. Only team owner can delete.
    """
    # Delete team using TeamManager service
    success = TeamManager.delete_team(
        team_id=str(team_id),
        deleted_by_id=str(request.user.id)
    )
    
    if success:
        return Response({
            'success': True,
            'message': 'Team deleted successfully'
        })
    else:
        return Response({
            'success': False,
            'error': 'Failed to delete team'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Team Membership Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
@team_error_handler('add_team_member')
def add_team_member(request, team_id):
    """
    Add member(s) to the team. Only team owner and leaders can add members.
    
    Required fields (one of):
    - player_id: UUID of a single player to add
    - player_ids: List of UUIDs for bulk addition
    """
    serializer = TeamMemberAddSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Handle bulk addition
    if 'player_ids' in serializer.validated_data:
        player_ids = serializer.validated_data['player_ids']
        added_members = []
        failed_additions = []
        
        for player_id in player_ids:
            try:
                membership = TeamManager.add_member(
                    team_id=str(team_id),
                    player_id=str(player_id),
                    added_by_id=str(request.user.id)
                )
                added_members.append(membership)
            except Exception as e:
                failed_additions.append({
                    'player_id': str(player_id),
                    'error': str(e)
                })
        
        # Return bulk addition results
        membership_serializer = TeamMembershipSerializer(added_members, many=True)
        return Response({
            'success': True,
            'data': membership_serializer.data,
            'message': f'{len(added_members)} member(s) added successfully',
            'failed': failed_additions if failed_additions else None
        }, status=status.HTTP_201_CREATED)
    
    # Handle single addition
    membership = TeamManager.add_member(
        team_id=str(team_id),
        player_id=str(serializer.validated_data['player_id']),
        added_by_id=str(request.user.id)
    )
    
    # Return membership data
    membership_serializer = TeamMembershipSerializer(membership)
    return Response({
        'success': True,
        'data': membership_serializer.data,
        'message': 'Member added successfully'
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def remove_team_member(request, team_id, player_id):
    """
    Remove a member from the team. Only team owner and leaders can remove members.
    Members can remove themselves.
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        membership = TeamMembership.objects.get(
            team=team,
            player_id=player_id,
            is_active=True
        )
        
        # Check permissions
        requester_membership = TeamMembership.objects.filter(
            team=team,
            player=request.user,
            is_active=True
        ).first()
        
        if not requester_membership:
            return Response({
                'success': False,
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Allow self-removal or removal by owner/leader
        can_remove = (
            str(request.user.id) == str(player_id) or  # Self-removal
            requester_membership.role in ['OWNER', 'LEADER']  # Owner/leader removal
        )
        
        if not can_remove:
            return Response({
                'success': False,
                'error': 'Only team owners, leaders, or the member themselves can remove members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Cannot remove the owner
        if membership.role == 'OWNER':
            return Response({
                'success': False,
                'error': 'Cannot remove team owner. Transfer ownership first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deactivate membership
        membership.is_active = False
        membership.save()
        
        # Record activity
        ActivityHistory.objects.create(
            team=team,
            event_type='MEMBER_REMOVED',
            description=f"{membership.player.full_name} was removed from the team",
            performed_by=request.user,
            metadata={
                'removed_player': membership.player.full_name,
                'removed_player_id': str(membership.player.id),
                'removed_by_self': str(request.user.id) == str(player_id)
            }
        )
        
        return Response({
            'success': True,
            'message': 'Member removed successfully'
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except TeamMembership.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Member not found in this team'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def update_member_role(request, team_id, player_id):
    """
    Update a team member's role. Only team owner can assign roles.
    
    Required fields:
    - role: New role ('LEADER' or 'MEMBER')
    """
    serializer = TeamMemberRoleUpdateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update role using RoleManager service
        membership = RoleManager.assign_role(
            team_id=str(team_id),
            player_id=str(player_id),
            role=serializer.validated_data['role'],
            assigned_by_id=str(request.user.id)
        )
        
        # Return updated membership data
        membership_serializer = TeamMembershipSerializer(membership)
        return Response({
            'success': True,
            'data': membership_serializer.data,
            'message': 'Role updated successfully'
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except RoleManager.InsufficientPermissionsError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except RoleManager.InvalidRoleAssignmentError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except ValidationError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def transfer_ownership(request, team_id):
    """
    Transfer team ownership to another member. Only current owner can transfer.
    
    Required fields:
    - new_owner_id: UUID of the new owner
    """
    serializer = OwnershipTransferSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Transfer ownership using RoleManager service
        new_owner_membership = RoleManager.transfer_ownership(
            team_id=str(team_id),
            new_owner_id=str(serializer.validated_data['new_owner_id']),
            current_owner_id=str(request.user.id)
        )
        
        # Return new owner membership data
        membership_serializer = TeamMembershipSerializer(new_owner_membership)
        return Response({
            'success': True,
            'data': membership_serializer.data,
            'message': 'Ownership transferred successfully'
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except RoleManager.InsufficientPermissionsError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except RoleManager.OwnershipTransferError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except ValidationError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Team Invitation Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def send_invitation(request, team_id):
    """
    Send an invitation to a player to join the team.
    Only team owner and leaders can send invitations.
    
    Required fields:
    - player_id: UUID of the player to invite
    """
    serializer = InvitationCreateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Send invitation using InvitationManager service
        invitation = InvitationManager.send_invitation(
            team_id=str(team_id),
            player_id=str(serializer.validated_data['player_id']),
            sender_id=str(request.user.id)
        )
        
        # Return invitation data
        invitation_serializer = InvitationSerializer(invitation)
        return Response({
            'success': True,
            'data': invitation_serializer.data,
            'message': 'Invitation sent successfully'
        }, status=status.HTTP_201_CREATED)
        
    except InvitationManager.InsufficientPermissionsError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except InvitationManager.TeamFullError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except InvitationManager.InvitationAlreadyExistsError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except ValidationError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def list_team_invitations(request, team_id):
    """
    List invitations for a specific team.
    Only team members can view team invitations.
    
    Query parameters:
    - status: Filter by status ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        
        # Check if user is a team member
        membership = TeamMembership.objects.filter(
            team=team,
            player=request.user,
            is_active=True
        ).first()
        
        if not membership:
            return Response({
                'success': False,
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get invitations
        status_filter = request.GET.get('status')
        invitations = InvitationManager.get_team_invitations(str(team_id), status_filter)
        
        # Serialize invitations
        serializer = InvitationSerializer(invitations, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(invitations)
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def list_player_invitations(request):
    """
    List pending invitations for the current player.
    """
    try:
        # Get pending invitations for the current user
        invitations = InvitationManager.get_pending_invitations(str(request.user.id))
        
        # Serialize invitations
        serializer = InvitationSerializer(invitations, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(invitations)
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def respond_to_invitation(request, invitation_id):
    """
    Respond to a team invitation (accept or decline).
    
    Required fields:
    - response: 'ACCEPTED' or 'DECLINED'
    """
    serializer = InvitationResponseSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Respond to invitation using InvitationManager service
        success = InvitationManager.respond_to_invitation(
            invitation_id=str(invitation_id),
            response=serializer.validated_data['response'],
            player_id=str(request.user.id)
        )
        
        if success:
            response_text = 'accepted' if serializer.validated_data['response'] == 'ACCEPTED' else 'declined'
            return Response({
                'success': True,
                'message': f'Invitation {response_text} successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to process invitation response'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Invitation.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except InvitationManager.InvitationExpiredError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except InvitationManager.TeamFullError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except ValidationError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required(['PLAYER', 'ORGANIZER', 'SYSTEM_ADMIN', 'VENUE_OWNER'])
def get_team_members(request, team_id):
    """
    Get all members of a specific team.
    
    Query parameters:
    - role: Filter by role ('OWNER', 'LEADER', 'MEMBER')
    - active: Filter by active status (true/false, default: true)
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        
        # Check if user has access to view team members
        # For now, allow any authenticated player to view team members
        # In the future, this could be restricted to team members only
        
        # Build query
        query = TeamMembership.objects.filter(team=team)
        
        # Apply filters
        role_filter = request.GET.get('role')
        if role_filter and role_filter in ['OWNER', 'LEADER', 'MEMBER']:
            query = query.filter(role=role_filter)
        
        active_filter = request.GET.get('active', 'true').lower()
        if active_filter == 'true':
            query = query.filter(is_active=True)
        elif active_filter == 'false':
            query = query.filter(is_active=False)
        
        # Get memberships with related player data
        memberships = query.select_related('player').order_by('-role', 'joined_at')
        
        # Serialize memberships
        serializer = TeamMembershipSerializer(memberships, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(memberships)
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required(['PLAYER', 'ORGANIZER', 'SYSTEM_ADMIN', 'VENUE_OWNER'])
def get_member_details(request, team_id, player_id):
    """
    Get detailed information about a specific team member.
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        membership = TeamMembership.objects.select_related('player').get(
            team=team,
            player_id=player_id
        )
        
        # Check if user has access to view member details
        # Allow team members to view other members' details
        requester_membership = TeamMembership.objects.filter(
            team=team,
            player=request.user,
            is_active=True
        ).first()
        
        if not requester_membership and getattr(request, 'user_role', 'PLAYER') == 'PLAYER':
            return Response({
                'success': False,
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Serialize membership
        serializer = TeamMembershipSerializer(membership)
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except TeamMembership.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Member not found in this team'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def cancel_invitation(request, invitation_id):
    """
    Cancel a pending invitation.
    Only invitation sender or team owner/leader can cancel.
    """
    try:
        # Cancel invitation using InvitationManager service
        success = InvitationManager.cancel_invitation(
            invitation_id=str(invitation_id),
            cancelled_by_id=str(request.user.id)
        )
        
        if success:
            return Response({
                'success': True,
                'message': 'Invitation cancelled successfully'
            })
        else:
            return Response({
                'success': False,
                'error': 'Failed to cancel invitation'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Invitation.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except InvitationManager.InsufficientPermissionsError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except ValidationError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def get_invitation_details(request, invitation_id):
    """
    Get detailed information about a specific invitation.
    """
    try:
        # Get invitation status using InvitationManager service
        invitation_data = InvitationManager.get_invitation_status(str(invitation_id))
        
        return Response({
            'success': True,
            'data': invitation_data
        })
        
    except Invitation.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Invitation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_activity_history(request, team_id):
    """
    Get activity history for a specific team with optional filtering.
    
    Query parameters:
    - limit: Maximum number of records to return
    - offset: Number of records to skip (for pagination)
    - event_types: Comma-separated list of event types to filter by
    - date_from: Start date for filtering (YYYY-MM-DD format)
    - date_to: End date for filtering (YYYY-MM-DD format)
    - performed_by: User ID to filter by
    """
    try:
        # Parse query parameters
        limit = request.GET.get('limit')
        if limit:
            limit = int(limit)
        
        offset = int(request.GET.get('offset', 0))
        
        event_types = request.GET.get('event_types')
        if event_types:
            event_types = [et.strip() for et in event_types.split(',')]
        
        date_from = request.GET.get('date_from')
        if date_from:
            from datetime import datetime
            date_from = datetime.strptime(date_from, '%Y-%m-%d')
        
        date_to = request.GET.get('date_to')
        if date_to:
            from datetime import datetime
            date_to = datetime.strptime(date_to, '%Y-%m-%d')
        
        performed_by_id = request.GET.get('performed_by')
        
        # Get activity history
        activities = ActivityHistoryService.get_team_activity_history(
            team_id=team_id,
            limit=limit,
            offset=offset,
            event_types=event_types,
            date_from=date_from,
            date_to=date_to,
            performed_by_id=performed_by_id
        )
        
        # Serialize activities
        activity_data = []
        for activity in activities:
            activity_data.append({
                'id': str(activity.id),
                'event_type': activity.event_type,
                'description': activity.description,
                'performed_by': {
                    'id': str(activity.performed_by.id),
                    'name': activity.performed_by.full_name
                } if activity.performed_by else None,
                'timestamp': activity.timestamp.isoformat(),
                'metadata': activity.metadata
            })
        
        return Response({
            'success': True,
            'data': activity_data,
            'count': len(activity_data)
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError as e:
        return Response({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_activity_summary(request, team_id):
    """
    Get activity summary for a specific team.
    
    Query parameters:
    - days: Number of days to analyze (default: 30)
    """
    try:
        days = int(request.GET.get('days', 30))
        
        summary = ActivityHistoryService.get_activity_summary(team_id, days)
        
        return Response({
            'success': True,
            'data': summary
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError as e:
        return Response({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_team_activity(request, team_id):
    """
    Get recent activity for a specific team.
    
    Query parameters:
    - days: Number of days to look back (default: 7)
    - limit: Maximum number of records to return (default: 10)
    """
    try:
        days = int(request.GET.get('days', 7))
        limit = int(request.GET.get('limit', 10))
        
        activities = ActivityHistoryService.get_recent_activity(team_id, days, limit)
        
        # Serialize activities
        activity_data = []
        for activity in activities:
            activity_data.append({
                'id': str(activity.id),
                'event_type': activity.event_type,
                'description': activity.description,
                'performed_by': {
                    'id': str(activity.performed_by.id),
                    'name': activity.performed_by.full_name
                } if activity.performed_by else None,
                'timestamp': activity.timestamp.isoformat(),
                'metadata': activity.metadata
            })
        
        return Response({
            'success': True,
            'data': activity_data,
            'count': len(activity_data)
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError as e:
        return Response({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_team_activity(request, team_id):
    """
    Search activity history for a specific team.
    
    Query parameters:
    - q: Search term (required)
    - limit: Maximum number of results to return (default: 50)
    """
    try:
        search_term = request.GET.get('q')
        if not search_term:
            return Response({
                'success': False,
                'error': 'Search term (q) is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        limit = int(request.GET.get('limit', 50))
        
        activities = ActivityHistoryService.search_activity_history(team_id, search_term, limit)
        
        # Serialize activities
        activity_data = []
        for activity in activities:
            activity_data.append({
                'id': str(activity.id),
                'event_type': activity.event_type,
                'description': activity.description,
                'performed_by': {
                    'id': str(activity.performed_by.id),
                    'name': activity.performed_by.full_name
                } if activity.performed_by else None,
                'timestamp': activity.timestamp.isoformat(),
                'metadata': activity.metadata
            })
        
        return Response({
            'success': True,
            'data': activity_data,
            'count': len(activity_data),
            'search_term': search_term
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError as e:
        return Response({
            'success': False,
            'error': f'Invalid parameter: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_activity_timeline(request, team_id):
    """
    Get activity timeline for a specific team, optionally grouped by date.
    
    Query parameters:
    - group_by_date: Whether to group activities by date (default: true)
    """
    try:
        group_by_date = request.GET.get('group_by_date', 'true').lower() == 'true'
        
        timeline = ActivityHistoryService.get_activity_timeline(team_id, group_by_date)
        
        if group_by_date:
            # Convert grouped timeline to serializable format
            timeline_data = {}
            for date_key, activities in timeline.items():
                timeline_data[date_key] = []
                for activity in activities:
                    timeline_data[date_key].append({
                        'id': str(activity.id),
                        'event_type': activity.event_type,
                        'description': activity.description,
                        'performed_by': {
                            'id': str(activity.performed_by.id),
                            'name': activity.performed_by.full_name
                        } if activity.performed_by else None,
                        'timestamp': activity.timestamp.isoformat(),
                        'metadata': activity.metadata
                    })
        else:
            # Convert activity list to serializable format
            timeline_data = []
            for activity in timeline:
                timeline_data.append({
                    'id': str(activity.id),
                    'event_type': activity.event_type,
                    'description': activity.description,
                    'performed_by': {
                        'id': str(activity.performed_by.id),
                        'name': activity.performed_by.full_name
                    } if activity.performed_by else None,
                    'timestamp': activity.timestamp.isoformat(),
                    'metadata': activity.metadata
                })
        
        return Response({
            'success': True,
            'data': timeline_data,
            'grouped_by_date': group_by_date
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_activity_statistics(request, team_id):
    """
    Get comprehensive activity statistics for a specific team.
    """
    try:
        statistics = ActivityHistoryService.get_activity_statistics(team_id)
        
        return Response({
            'success': True,
            'data': statistics
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_team_activity_history(request, team_id):
    """
    Export activity history for a specific team.
    
    Query parameters:
    - format: Export format ('dict' or 'csv', default: 'dict')
    """
    try:
        export_format = request.GET.get('format', 'dict')
        
        if export_format not in ['dict', 'csv']:
            return Response({
                'success': False,
                'error': 'Format must be "dict" or "csv"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        exported_data = ActivityHistoryService.export_activity_history(team_id, export_format)
        
        if export_format == 'csv':
            from django.http import HttpResponse
            response = HttpResponse(exported_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="team_{team_id}_activity_history.csv"'
            return response
        else:
            return Response({
                'success': True,
                'data': exported_data,
                'format': export_format
            })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Match Scoring Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('ORGANIZER')
def record_futsal_match_score(request, match_id):
    """
    Record futsal match score with player statistics.
    Only tournament organizers can record match scores.
    
    Required fields:
    - home_team_data: Dict with 'goals' and 'player_stats' list
    - away_team_data: Dict with 'goals' and 'player_stats' list
    
    Player stats format:
    - player_id: UUID of the player
    - goals: Number of goals scored
    - assists: Number of assists
    - minutes_played: Minutes played in the match
    """
    try:
        # Validate request data
        if not request.data.get('home_team_data') or not request.data.get('away_team_data'):
            return Response({
                'success': False,
                'error': 'Both home_team_data and away_team_data are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Record match score using MatchScorer service
        match = MatchScorer.record_futsal_match(
            match_id=str(match_id),
            home_team_data=request.data['home_team_data'],
            away_team_data=request.data['away_team_data'],
            organizer_id=str(request.user.id)
        )
        
        # Return match data
        match_data = {
            'id': str(match.id),
            'tournament_id': str(match.tournament.id),
            'round_number': match.round_number,
            'match_number': match.match_number,
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
            'status': match.status,
            'actual_start_time': match.actual_start_time.isoformat() if match.actual_start_time else None,
            'actual_end_time': match.actual_end_time.isoformat() if match.actual_end_time else None
        }
        
        return Response({
            'success': True,
            'data': match_data,
            'message': 'Futsal match score recorded successfully'
        })
        
    except MatchNotFoundError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_404_NOT_FOUND)
    
    except UnauthorizedScoringError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except InvalidScoreError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except MatchAlreadyScoredError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('ORGANIZER')
def record_badminton_match_score(request, match_id):
    """
    Record badminton match score with set details.
    Only tournament organizers can record match scores.
    
    Required fields:
    - sets_data: List of dicts with 'set_number', 'home_score', 'away_score', 'duration'
    
    Set data format:
    - set_number: Set number (1, 2, or 3)
    - home_score: Home team/player score for this set
    - away_score: Away team/player score for this set
    - duration: Duration of the set in minutes
    """
    try:
        # Validate request data
        if not request.data.get('sets_data'):
            return Response({
                'success': False,
                'error': 'sets_data is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Record match score using MatchScorer service
        match = MatchScorer.record_badminton_match(
            match_id=str(match_id),
            sets_data=request.data['sets_data'],
            organizer_id=str(request.user.id)
        )
        
        # Return match data
        match_data = {
            'id': str(match.id),
            'tournament_id': str(match.tournament.id),
            'round_number': match.round_number,
            'match_number': match.match_number,
            'status': match.status,
            'sets_won': {
                'home': match.player1_score,
                'away': match.player2_score
            }
        }
        
        # Add team or player data based on tournament type
        if match.tournament.registration_type == 'TEAM':
            match_data.update({
                'team1': {
                    'id': str(match.team1.id),
                    'name': match.team1.name
                } if match.team1 else None,
                'team2': {
                    'id': str(match.team2.id),
                    'name': match.team2.name
                } if match.team2 else None,
                'winning_team': {
                    'id': str(match.winning_team.id),
                    'name': match.winning_team.name
                } if match.winning_team else None
            })
        else:
            match_data.update({
                'player1': {
                    'id': str(match.player1.id),
                    'name': match.player1.full_name
                } if match.player1 else None,
                'player2': {
                    'id': str(match.player2.id),
                    'name': match.player2.full_name
                } if match.player2 else None,
                'winner': {
                    'id': str(match.winner.id),
                    'name': match.winner.full_name
                } if match.winner else None
            })
        
        # Add set details
        sets_data = []
        for badminton_set in match.badminton_sets.all():
            sets_data.append({
                'set_number': badminton_set.set_number,
                'home_score': badminton_set.home_score,
                'away_score': badminton_set.away_score,
                'duration': badminton_set.duration,
                'winner': badminton_set.get_winner()
            })
        match_data['sets'] = sets_data
        
        return Response({
            'success': True,
            'data': match_data,
            'message': 'Badminton match score recorded successfully'
        })
        
    except MatchNotFoundError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_404_NOT_FOUND)
    
    except UnauthorizedScoringError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except InvalidScoreError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except MatchAlreadyScoredError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@role_required('ORGANIZER')
def update_match_score(request, match_id):
    """
    Update an existing match score.
    Only tournament organizers can update match scores.
    
    Required fields depend on sport type:
    - For futsal: home_team_data and away_team_data (same format as record_futsal_match_score)
    - For badminton: sets_data (same format as record_badminton_match_score)
    """
    try:
        # Update match score using MatchScorer service
        match = MatchScorer.update_match_score(
            match_id=str(match_id),
            score_update=request.data,
            organizer_id=str(request.user.id)
        )
        
        # Return updated match data
        match_data = {
            'id': str(match.id),
            'tournament_id': str(match.tournament.id),
            'round_number': match.round_number,
            'match_number': match.match_number,
            'status': match.status,
            'sport_type': match.tournament.sport_type
        }
        
        # Add sport-specific data
        if match.tournament.sport_type == 'FUTSAL':
            if match.tournament.registration_type == 'TEAM':
                match_data.update({
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
                    } if match.winning_team else None
                })
        elif match.tournament.sport_type == 'BADMINTON':
            match_data['sets_won'] = {
                'home': match.player1_score,
                'away': match.player2_score
            }
            
            if match.tournament.registration_type == 'TEAM':
                match_data.update({
                    'team1': {
                        'id': str(match.team1.id),
                        'name': match.team1.name
                    } if match.team1 else None,
                    'team2': {
                        'id': str(match.team2.id),
                        'name': match.team2.name
                    } if match.team2 else None,
                    'winning_team': {
                        'id': str(match.winning_team.id),
                        'name': match.winning_team.name
                    } if match.winning_team else None
                })
            else:
                match_data.update({
                    'player1': {
                        'id': str(match.player1.id),
                        'name': match.player1.full_name
                    } if match.player1 else None,
                    'player2': {
                        'id': str(match.player2.id),
                        'name': match.player2.full_name
                    } if match.player2 else None,
                    'winner': {
                        'id': str(match.winner.id),
                        'name': match.winner.full_name
                    } if match.winner else None
                })
        
        return Response({
            'success': True,
            'data': match_data,
            'message': 'Match score updated successfully'
        })
        
    except MatchNotFoundError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_404_NOT_FOUND)
    
    except UnauthorizedScoringError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_403_FORBIDDEN)
    
    except InvalidScoreError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('ORGANIZER')
def validate_match_score(request):
    """
    Validate match score data before submission.
    
    Required fields:
    - sport_type: 'FUTSAL' or 'BADMINTON'
    - score_data: Score data to validate (format depends on sport)
    """
    try:
        sport_type = request.data.get('sport_type')
        score_data = request.data.get('score_data')
        
        if not sport_type or not score_data:
            return Response({
                'success': False,
                'error': 'Both sport_type and score_data are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate score using MatchScorer service
        validation_result = MatchScorer.validate_score(score_data, sport_type)
        
        return Response({
            'success': True,
            'data': validation_result
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_match_details(request, match_id):
    """
    Get detailed match information including scores and statistics.
    Available to all authenticated users.
    """
    try:
        match = Match.objects.select_related(
            'tournament', 'team1', 'team2', 'player1', 'player2', 'winner', 'winning_team'
        ).prefetch_related(
            'futsal_scores__player_stats__player',
            'badminton_sets'
        ).get(id=match_id)
        
        # Build match data
        match_data = {
            'id': str(match.id),
            'tournament': {
                'id': str(match.tournament.id),
                'title': match.tournament.title,
                'sport_type': match.tournament.sport_type,
                'registration_type': match.tournament.registration_type
            },
            'round_number': match.round_number,
            'match_number': match.match_number,
            'status': match.status,
            'scheduled_time': match.scheduled_time.isoformat() if match.scheduled_time else None,
            'actual_start_time': match.actual_start_time.isoformat() if match.actual_start_time else None,
            'actual_end_time': match.actual_end_time.isoformat() if match.actual_end_time else None,
            'notes': match.notes
        }
        
        # Add participants based on tournament type
        if match.tournament.registration_type == 'TEAM':
            match_data.update({
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
                } if match.winning_team else None
            })
        else:
            match_data.update({
                'player1': {
                    'id': str(match.player1.id),
                    'name': match.player1.full_name
                } if match.player1 else None,
                'player2': {
                    'id': str(match.player2.id),
                    'name': match.player2.full_name
                } if match.player2 else None,
                'player1_score': match.player1_score,
                'player2_score': match.player2_score,
                'winner': {
                    'id': str(match.winner.id),
                    'name': match.winner.full_name
                } if match.winner else None
            })
        
        # Add sport-specific details
        if match.tournament.sport_type == 'FUTSAL' and match.status == 'COMPLETED':
            # Add futsal statistics
            futsal_scores = []
            for futsal_score in match.futsal_scores.all():
                player_stats = []
                for stat in futsal_score.player_stats.all():
                    player_stats.append({
                        'player': {
                            'id': str(stat.player.id),
                            'name': stat.player.full_name
                        },
                        'goals': stat.goals,
                        'assists': stat.assists,
                        'minutes_played': stat.minutes_played
                    })
                
                futsal_scores.append({
                    'team': {
                        'id': str(futsal_score.team.id),
                        'name': futsal_score.team.name
                    },
                    'goals': futsal_score.goals,
                    'player_stats': player_stats
                })
            
            match_data['futsal_scores'] = futsal_scores
        
        elif match.tournament.sport_type == 'BADMINTON' and match.status == 'COMPLETED':
            # Add badminton set details
            sets = []
            for badminton_set in match.badminton_sets.all():
                sets.append({
                    'set_number': badminton_set.set_number,
                    'home_score': badminton_set.home_score,
                    'away_score': badminton_set.away_score,
                    'duration': badminton_set.duration,
                    'winner': badminton_set.get_winner()
                })
            
            match_data['sets'] = sets
        
        return Response({
            'success': True,
            'data': match_data
        })
        
    except Match.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Match not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Team Join Request Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def request_to_join_team(request, team_id):
    """
    Send a request to join a team.
    
    Optional fields:
    - message: Optional message to team owner/leaders
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        
        # Check if team is full
        if team.is_full:
            return Response({
                'success': False,
                'error': 'Team is full'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if player is already a member
        existing_membership = TeamMembership.objects.filter(
            team=team,
            player=request.user,
            is_active=True
        ).exists()
        
        if existing_membership:
            return Response({
                'success': False,
                'error': 'You are already a member of this team'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if there's already a pending request
        existing_request = TeamJoinRequest.objects.filter(
            team=team,
            player=request.user,
            status='PENDING'
        ).exists()
        
        if existing_request:
            return Response({
                'success': False,
                'error': 'You already have a pending request to join this team'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if there's a pending invitation
        pending_invitation = Invitation.objects.filter(
            team=team,
            player=request.user,
            status='PENDING'
        ).exists()
        
        if pending_invitation:
            return Response({
                'success': False,
                'error': 'You have a pending invitation to join this team. Please respond to the invitation instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate request data
        serializer = TeamJoinRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create join request
        join_request = TeamJoinRequest.objects.create(
            team=team,
            player=request.user,
            message=serializer.validated_data.get('message', '')
        )
        
        # Record activity
        ActivityHistory.objects.create(
            team=team,
            event_type='JOIN_REQUEST_SENT',
            description=f"{request.user.full_name} requested to join the team",
            performed_by=request.user,
            metadata={
                'player_id': str(request.user.id),
                'player_name': request.user.full_name,
                'request_id': str(join_request.id)
            }
        )

        # Notify team owners and leaders
        from .services.notification_service import TeamNotificationService
        TeamNotificationService.send_join_request_notification(join_request)

        # Return join request data
        join_request_serializer = TeamJoinRequestSerializer(join_request)
        return Response({
            'success': True,
            'data': join_request_serializer.data,
            'message': 'Join request sent successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def list_team_join_requests(request, team_id):
    """
    List join requests for a specific team.
    Only team owner and leaders can view join requests.
    
    Query parameters:
    - status: Filter by status ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')
    """
    try:
        team = Team.objects.get(id=team_id, is_active=True)
        
        # Check if user is a team owner or leader
        membership = TeamMembership.objects.filter(
            team=team,
            player=request.user,
            is_active=True,
            role__in=['OWNER', 'LEADER']
        ).first()
        
        if not membership:
            return Response({
                'success': False,
                'error': 'Only team owners and leaders can view join requests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get join requests
        status_filter = request.GET.get('status')
        join_requests = TeamJoinRequest.objects.filter(team=team).select_related('player', 'responded_by')
        
        if status_filter and status_filter in ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED']:
            join_requests = join_requests.filter(status=status_filter)
        
        join_requests = join_requests.order_by('-created_at')
        
        # Serialize join requests
        serializer = TeamJoinRequestSerializer(join_requests, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(join_requests)
        })
        
    except Team.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Team not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def list_my_join_requests(request):
    """
    List join requests sent by the current player.
    """
    try:
        # Get join requests sent by the current user
        join_requests = TeamJoinRequest.objects.filter(
            player=request.user
        ).select_related('team__owner', 'responded_by').order_by('-created_at')
        
        # Serialize join requests
        serializer = TeamJoinRequestSerializer(join_requests, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(join_requests)
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def respond_to_join_request(request, request_id):
    """
    Respond to a team join request (accept or decline).
    Only team owner and leaders can respond.
    
    Required fields:
    - response: 'ACCEPTED' or 'DECLINED'
    """
    try:
        join_request = TeamJoinRequest.objects.select_related('team', 'player').get(id=request_id)
        
        # Check if user is a team owner or leader
        membership = TeamMembership.objects.filter(
            team=join_request.team,
            player=request.user,
            is_active=True,
            role__in=['OWNER', 'LEADER']
        ).first()
        
        if not membership:
            return Response({
                'success': False,
                'error': 'Only team owners and leaders can respond to join requests'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if request can be responded to
        if not join_request.can_respond():
            return Response({
                'success': False,
                'error': f'This request has already been {join_request.status.lower()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate response
        serializer = TeamJoinRequestResponseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response_action = serializer.validated_data['response']
        
        # If accepting, check if team is full
        if response_action == 'ACCEPTED':
            if join_request.team.is_full:
                return Response({
                    'success': False,
                    'error': 'Team is full'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Add player to team
            membership = TeamMembership.objects.create(
                team=join_request.team,
                player=join_request.player,
                role='MEMBER'
            )
            
            # Record activity
            ActivityHistory.objects.create(
                team=join_request.team,
                event_type='JOIN_REQUEST_ACCEPTED',
                description=f"{join_request.player.full_name}'s join request was accepted by {request.user.full_name}",
                performed_by=request.user,
                metadata={
                    'player_id': str(join_request.player.id),
                    'player_name': join_request.player.full_name,
                    'accepted_by_id': str(request.user.id),
                    'accepted_by_name': request.user.full_name
                }
            )
        else:
            # Record activity for declined request
            ActivityHistory.objects.create(
                team=join_request.team,
                event_type='JOIN_REQUEST_DECLINED',
                description=f"{join_request.player.full_name}'s join request was declined by {request.user.full_name}",
                performed_by=request.user,
                metadata={
                    'player_id': str(join_request.player.id),
                    'player_name': join_request.player.full_name,
                    'declined_by_id': str(request.user.id),
                    'declined_by_name': request.user.full_name
                }
            )
        
        # Update join request
        join_request.status = response_action
        join_request.responded_at = timezone.now()
        join_request.responded_by = request.user
        join_request.save()

        # Notify the player of the decision
        from .services.notification_service import TeamNotificationService
        TeamNotificationService.send_join_request_response_notification(join_request, response_action)

        response_text = 'accepted' if response_action == 'ACCEPTED' else 'declined'
        return Response({
            'success': True,
            'message': f'Join request {response_text} successfully'
        })
        
    except TeamJoinRequest.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Join request not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@role_required('PLAYER')
def cancel_join_request(request, request_id):
    """
    Cancel a pending join request.
    Only the player who sent the request can cancel it.
    """
    try:
        join_request = TeamJoinRequest.objects.select_related('team').get(
            id=request_id,
            player=request.user
        )
        
        # Check if request can be cancelled
        if not join_request.can_respond():
            return Response({
                'success': False,
                'error': f'Cannot cancel a request that has been {join_request.status.lower()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status to cancelled
        join_request.status = 'CANCELLED'
        join_request.save()
        
        return Response({
            'success': True,
            'message': 'Join request cancelled successfully'
        })
        
    except TeamJoinRequest.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Join request not found or you do not have permission to cancel it'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        return Response({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
