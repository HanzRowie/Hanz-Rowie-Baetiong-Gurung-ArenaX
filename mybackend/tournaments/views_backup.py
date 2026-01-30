from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from accounts.decorators import jwt_required
from accounts.models import CustomUser
from accounts.utils import decode_jwt

from .models import Tournament, TournamentRegistration, Match
from .serializers import TournamentSerializer, TournamentRegistrationSerializer, MatchSerializer
from referees.models import RefereeBooking
from referees.serializers import RefereeBookingSerializer

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all().order_by('-created_at')
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Role-based filtering
        if user.role == 'ORGANIZER':
            # Organizers only see their own tournaments
            queryset = Tournament.objects.filter(organizer=user)
        else:
            # Players, referees, and venue owners see all tournaments
            queryset = Tournament.objects.all()
        
        # Apply additional filters
        sport_type = self.request.query_params.get('sport_type', None)
        status_filter = self.request.query_params.get('status', None)

        if sport_type:
            queryset = queryset.filter(sport_type=sport_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

class TournamentRegistrationViewSet(viewsets.ModelViewSet):
    queryset = TournamentRegistration.objects.all()
    serializer_class = TournamentRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TournamentRegistration.objects.filter(player=self.request.user)

@api_view(['POST'])
def register_for_tournament(request, tournament_id):
    """Register a player for a tournament"""
    # Simple JWT authentication check
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Import here to avoid circular imports
        from accounts.utils import decode_jwt
        
        token = auth_header.split(' ')[1]
        payload = decode_jwt(token)
        if not payload:
            return Response({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = CustomUser.objects.get(id=payload['user_id'])
        tournament = get_object_or_404(Tournament, id=tournament_id)

        # Check if user is already registered
        if TournamentRegistration.objects.filter(tournament=tournament, player=user).exists():
            return Response({'error': 'Already registered for this tournament'}, status=status.HTTP_400_BAD_REQUEST)

        # Create registration with PENDING status (requires organizer approval)
        registration = TournamentRegistration.objects.create(
            tournament=tournament,
            player=user,
            status='PENDING'
        )

        return Response({
            'message': 'Registration submitted successfully. Awaiting organizer approval.',
            'registration_id': str(registration.id),
            'tournament': tournament.title,
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@jwt_required
def withdraw_from_tournament(request, tournament_id):
    """Withdraw from a tournament"""
    user = CustomUser.objects.get(id=request.user_id)
    tournament = get_object_or_404(Tournament, id=tournament_id)

    try:
        registration = TournamentRegistration.objects.get(
            tournament=tournament,
            player=user
        )

        # Check if tournament has started
        from django.utils import timezone
        if timezone.now() >= tournament.date:
            return Response({'error': 'Cannot withdraw from an ongoing tournament'}, status=status.HTTP_400_BAD_REQUEST)

        registration.delete()
        return Response({'message': 'Successfully withdrawn from tournament'}, status=status.HTTP_200_OK)

    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Not registered for this tournament'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tournaments(request):
    """Get tournaments for current user based on their role"""
    user = request.user
    
    if user.role == 'ORGANIZER':
        # Organizers get their created tournaments
        organized_tournaments = Tournament.objects.filter(organizer=user).order_by('-created_at')
        
        # Also get tournaments they're registered for (if any)
        registrations = TournamentRegistration.objects.filter(player=user).select_related('tournament')
        registered_tournaments = [reg.tournament for reg in registrations]
        
        return Response({
            'organized_tournaments': TournamentSerializer(organized_tournaments, many=True).data,
            'registered_tournaments': TournamentSerializer(registered_tournaments, many=True).data
        }, status=status.HTTP_200_OK)
    
    elif user.role == 'PLAYER':
        # Players get tournaments they're registered for
        registrations = TournamentRegistration.objects.filter(player=user).select_related('tournament')
        registered_tournaments = [reg.tournament for reg in registrations]
        
        return Response({
            'organized_tournaments': [],
            'registered_tournaments': TournamentSerializer(registered_tournaments, many=True).data
        }, status=status.HTTP_200_OK)
    
    else:
        # Other roles (REFEREE, VENUE_OWNER) get empty lists for now
        return Response({
            'organized_tournaments': [],
            'registered_tournaments': []
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament(request):
    """Create a new tournament (organizer only)"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can create tournaments'}, status=status.HTTP_403_FORBIDDEN)

    try:
        data = request.data.copy()
        linked_venue_id = data.get('linked_venue_id')
        
        # If a venue is selected, create a booking for it
        venue_booking = None
        if linked_venue_id:
            from venues.models import Venue, VenueBooking
            from venues.views import book_venue
            from datetime import datetime
            
            try:
                venue = Venue.objects.get(id=linked_venue_id)
                
                # Create venue booking data
                booking_data = {
                    'date': data.get('date'),
                    'start_time': data.get('start_time'),
                    'end_time': data.get('end_time', data.get('start_time')),  # Use start_time if end_time not provided
                    'purpose': f"Tournament: {data.get('title', 'Tournament')}",
                    'notes': f"Automatically booked for tournament creation. Tournament ID will be updated after creation."
                }
                
                # Validate required fields
                if not all([booking_data['date'], booking_data['start_time']]):
                    return Response({'error': 'Date and start_time are required for venue booking'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Convert time strings to time objects
                start_time_obj = datetime.strptime(booking_data['start_time'], '%H:%M').time()
                end_time_obj = datetime.strptime(booking_data['end_time'], '%H:%M').time()
                
                # Check venue availability (similar logic to book_venue)
                from venues.models import VenueAvailability
                
                # Check for availability slots
                available_slots = VenueAvailability.objects.filter(
                    venue=venue,
                    date=booking_data['date'],
                    is_available=True
                ).filter(
                    start_time__lte=booking_data['start_time'],
                    end_time__gte=booking_data['end_time']
                )
                
                has_availability_slots = VenueAvailability.objects.filter(venue=venue, date=booking_data['date']).exists()
                
                if has_availability_slots and not available_slots.exists():
                    return Response({'error': 'Selected venue is not available for this time slot'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check for conflicting bookings
                conflicting_bookings = VenueBooking.objects.filter(
                    venue=venue,
                    date=booking_data['date'],
                    status__in=['PENDING', 'CONFIRMED']
                ).filter(
                    start_time__lt=booking_data['end_time'],
                    end_time__gt=booking_data['start_time']
                )
                
                if conflicting_bookings.exists():
                    return Response({'error': 'Selected venue is already booked for this time slot'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Create the venue booking
                venue_booking = VenueBooking.objects.create(
                    venue=venue,
                    user=request.user,
                    date=booking_data['date'],
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    purpose=booking_data['purpose'],
                    notes=booking_data['notes'],
                    status='CONFIRMED'  # Auto-confirm tournament bookings
                )
                
                # Update tournament data with venue info
                data['venue'] = venue.name
                data['venue_address'] = venue.location
                data['linked_venue'] = venue.id
                data['venue_booking'] = venue_booking.id
                
            except Venue.DoesNotExist:
                return Response({'error': 'Selected venue does not exist'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': f'Venue booking failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the tournament
        serializer = TournamentSerializer(data=data)
        if serializer.is_valid():
            tournament = serializer.save(organizer=request.user)
            
            # Update venue booking with tournament reference
            if venue_booking:
                venue_booking.notes = f"Tournament: {tournament.title} (ID: {tournament.id})"
                venue_booking.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # If tournament creation fails and we created a booking, clean it up
            if venue_booking:
                venue_booking.delete()
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': f'Tournament creation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Match.objects.all().order_by('round_number', 'match_number')
    serializer_class = MatchSerializer

class RefereeBookingViewSet(viewsets.ModelViewSet):
    queryset = RefereeBooking.objects.all()
    serializer_class = RefereeBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'REFEREE':
            return RefereeBooking.objects.filter(referee=self.request.user)
        elif self.request.user.role == 'ORGANIZER':
            return RefereeBooking.objects.filter(requested_by=self.request.user)
        return RefereeBooking.objects.none()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_participants(request, tournament_id):
    """Get participants for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can view participants'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get status filter from query params
    status_filter = request.query_params.get('status', None)
    
    registrations = TournamentRegistration.objects.filter(tournament=tournament).select_related('player')
    
    if status_filter:
        registrations = registrations.filter(status=status_filter.upper())
    
    participants = []
    
    for registration in registrations:
        participants.append({
            'id': str(registration.id),
            'user': {
                'id': str(registration.player.id),
                'full_name': registration.player.full_name,
                'email': registration.player.email,
                'profile_picture': registration.player.profile_picture.url if registration.player.profile_picture else None
            },
            'status': registration.status,
            'registration_date': registration.registered_at,
            'notes': registration.notes,
            'payment_status': 'paid'  # Simplified for now
        })
    
    # Add summary counts
    status_counts = {
        'pending': TournamentRegistration.objects.filter(tournament=tournament, status='PENDING').count(),
        'accepted': TournamentRegistration.objects.filter(tournament=tournament, status='ACCEPTED').count(),
        'rejected': TournamentRegistration.objects.filter(tournament=tournament, status='REJECTED').count(),
        'total': TournamentRegistration.objects.filter(tournament=tournament).count()
    }
    
    return Response({
        'participants': participants,
        'status_counts': status_counts,
        'max_participants': tournament.max_participants
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tournament_referees(request, tournament_id):
    """Get referee assignments for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can view referee assignments'}, status=status.HTTP_403_FORBIDDEN)
    
    referee_bookings = RefereeBooking.objects.filter(tournament=tournament).select_related('referee')
    referees = []
    
    for booking in referee_bookings:
        referees.append({
            'id': str(booking.id),
            'referee': {
                'id': str(booking.referee.id),
                'full_name': booking.referee.full_name,
                'email': booking.referee.email
            },
            'match_date': booking.match_date,
            'fee': float(booking.fee) if booking.fee else 0.0,
            'status': booking.status
        })
    
    return Response(referees, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_tournament_participant(request, tournament_id, participant_id):
    """Remove a participant from a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can remove participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        registration.delete()
        return Response({'message': 'Participant removed successfully'}, status=status.HTTP_200_OK)
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_tournament_referee(request, tournament_id, referee_id):
    """Remove a referee assignment from a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can remove referee assignments'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        referee_booking = RefereeBooking.objects.get(id=referee_id, tournament=tournament)
        referee_booking.delete()
        return Response({'message': 'Referee assignment removed successfully'}, status=status.HTTP_200_OK)
    except RefereeBooking.DoesNotExist:
        return Response({'error': 'Referee assignment not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def accept_tournament_participant(request, tournament_id, participant_id):
    """Accept a participant's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can accept participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        
        # Check if tournament is full
        accepted_count = TournamentRegistration.objects.filter(
            tournament=tournament, 
            status='ACCEPTED'
        ).count()
        
        if accepted_count >= tournament.max_participants:
            return Response({'error': 'Tournament is already full'}, status=status.HTTP_400_BAD_REQUEST)
        
        registration.status = 'ACCEPTED'
        registration.save()
        
        return Response({
            'message': f'Participant {registration.player.full_name} accepted successfully',
            'participant': {
                'id': str(registration.id),
                'user': {
                    'id': str(registration.player.id),
                    'full_name': registration.player.full_name,
                    'email': registration.player.email
                },
                'status': registration.status,
                'registration_date': registration.registered_at
            }
        }, status=status.HTTP_200_OK)
        
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant registration not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def reject_tournament_participant(request, tournament_id, participant_id):
    """Reject a participant's registration for a tournament"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        registration = TournamentRegistration.objects.get(id=participant_id, tournament=tournament)
        
        registration.status = 'REJECTED'
        registration.notes = request.data.get('reason', 'No reason provided')
        registration.save()
        
        return Response({
            'message': f'Participant {registration.player.full_name} rejected successfully',
            'participant': {
                'id': str(registration.id),
                'user': {
                    'id': str(registration.player.id),
                    'full_name': registration.player.full_name,
                    'email': registration.player.email
                },
                'status': registration.status,
                'registration_date': registration.registered_at,
                'rejection_reason': registration.notes
            }
        }, status=status.HTTP_200_OK)
        
    except TournamentRegistration.DoesNotExist:
        return Response({'error': 'Participant registration not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_accept_participants(request, tournament_id):
    """Accept multiple participants at once"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can accept participants'}, status=status.HTTP_403_FORBIDDEN)
    
    participant_ids = request.data.get('participant_ids', [])
    if not participant_ids:
        return Response({'error': 'No participant IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check current accepted count
        accepted_count = TournamentRegistration.objects.filter(
            tournament=tournament, 
            status='ACCEPTED'
        ).count()
        
        # Check if accepting all would exceed limit
        if accepted_count + len(participant_ids) > tournament.max_participants:
            return Response({
                'error': f'Cannot accept {len(participant_ids)} participants. Only {tournament.max_participants - accepted_count} spots remaining.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update registrations
        updated_registrations = TournamentRegistration.objects.filter(
            id__in=participant_ids,
            tournament=tournament,
            status='PENDING'
        )
        
        updated_count = updated_registrations.update(status='ACCEPTED')
        
        return Response({
            'message': f'Successfully accepted {updated_count} participants',
            'accepted_count': updated_count,
            'total_accepted': accepted_count + updated_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_reject_participants(request, tournament_id):
    """Reject multiple participants at once"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject participants'}, status=status.HTTP_403_FORBIDDEN)
    
    participant_ids = request.data.get('participant_ids', [])
    rejection_reason = request.data.get('reason', 'Bulk rejection - no specific reason provided')
    
    if not participant_ids:
        return Response({'error': 'No participant IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update registrations
        updated_registrations = TournamentRegistration.objects.filter(
            id__in=participant_ids,
            tournament=tournament,
            status='PENDING'
        )
        
        updated_count = updated_registrations.update(
            status='REJECTED',
            notes=rejection_reason
        )
        
        return Response({
            'message': f'Successfully rejected {updated_count} participants',
            'rejected_count': updated_count,
            'reason': rejection_reason
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_team_for_tournament(request, tournament_id):
    """Register a team for a tournament"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from teams.services.tournament_validator import TournamentValidator
        from teams.services.player_selector import PlayerSelector
        from accounts.models import CustomUser
        
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        # Validate tournament supports team registration
        if tournament.registration_type != 'TEAM':
            return Response({
                'error': 'This tournament only accepts individual registrations'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team ID and selected players from request
        team_id = request.data.get('team_id')
        selected_player_ids = request.data.get('selected_players', [])
        
        if not team_id:
            return Response({
                'error': 'Team ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not selected_player_ids:
            return Response({
                'error': 'Selected players are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team and validate user can register it
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user can register this team (must be owner or leader)
        try:
            membership = TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
            if not membership.can_register_for_tournaments():
                return Response({
                    'error': 'Only team owners and leaders can register teams for tournaments'
                }, status=status.HTTP_403_FORBIDDEN)
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if team is already registered
        if TeamTournamentRegistration.objects.filter(tournament=tournament, team=team).exists():
            return Response({
                'error': 'Team is already registered for this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate tournament is open for registration
        if not tournament.is_registration_open:
            return Response({
                'error': 'Tournament registration is closed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate team composition using TournamentValidator
        validator = TournamentValidator()
        validation_result = validator.validate_team_composition(team, tournament)
        
        if not validation_result['is_valid']:
            return Response({
                'error': validation_result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate selected players
        selected_players = CustomUser.objects.filter(
            id__in=selected_player_ids,
            role='PLAYER'
        )
        
        if selected_players.count() != len(selected_player_ids):
            return Response({
                'error': 'Some selected players were not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all selected players are team members
        team_member_ids = set(
            TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).values_list('player_id', flat=True)
        )
        
        selected_player_ids_set = set(selected_player_ids)
        if not selected_player_ids_set.issubset(team_member_ids):
            return Response({
                'error': 'All selected players must be active team members'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate player selection using PlayerSelector
        player_selector = PlayerSelector()
        selection_result = player_selector.validate_player_selection(
            selected_players.values_list('id', flat=True),
            tournament
        )
        
        if not selection_result['is_valid']:
            return Response({
                'error': selection_result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create team tournament registration
        registration = TeamTournamentRegistration.objects.create(
            tournament=tournament,
            team=team,
            registered_by=request.user,
            status='PENDING'
        )
        
        # Add selected players
        registration.selected_players.set(selected_players)
        
        # Record activity history
        from teams.models import ActivityHistory
        ActivityHistory.objects.create(
            team=team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team registered for tournament: {tournament.title}',
            performed_by=request.user,
            metadata={
                'tournament_id': str(tournament.id),
                'tournament_title': tournament.title,
                'selected_players': len(selected_player_ids)
            }
        )
        
        return Response({
            'message': 'Team registered successfully. Awaiting organizer approval.',
            'registration_id': str(registration.id),
            'tournament': tournament.title,
            'team': team.name,
            'selected_players': len(selected_player_ids),
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Registration failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_available_tournaments(request, team_id):
    """Get available tournaments for a specific team"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from django.utils import timezone
        
        # Get team and validate user access
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member of this team
        try:
            TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get tournaments that:
        # 1. Accept team registration
        # 2. Match team's sport types
        # 3. Are open for registration
        # 4. Team is not already registered for
        
        # Get already registered tournament IDs
        registered_tournament_ids = TeamTournamentRegistration.objects.filter(
            team=team
        ).values_list('tournament_id', flat=True)
        
        # Filter tournaments
        available_tournaments = Tournament.objects.filter(
            registration_type='TEAM',
            sport_type__in=team.sport_types,
            status='UPCOMING',
            registration_deadline__gt=timezone.now()
        ).exclude(
            id__in=registered_tournament_ids
        ).order_by('date', 'start_time')
        
        # Apply additional filters from query params
        sport_filter = request.query_params.get('sport_type')
        if sport_filter:
            available_tournaments = available_tournaments.filter(sport_type=sport_filter)
        
        # Serialize tournaments
        serializer = TournamentSerializer(
            available_tournaments, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'team': {
                'id': str(team.id),
                'name': team.name,
                'sport_types': team.sport_types
            },
            'available_tournaments': serializer.data,
            'total_count': available_tournaments.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to fetch available tournaments: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    """Reject multiple participants at once"""
    tournament = get_object_or_404(Tournament, id=tournament_id)
    
    # Check if user is the organizer
    if request.user != tournament.organizer:
        return Response({'error': 'Only tournament organizers can reject participants'}, status=status.HTTP_403_FORBIDDEN)
    
    participant_ids = request.data.get('participant_ids', [])
    rejection_reason = request.data.get('reason', 'Bulk rejection - no specific reason provided')
    
    if not participant_ids:
        return Response({'error': 'No participant IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update registrations
        updated_registrations = TournamentRegistration.objects.filter(
            id__in=participant_ids,
            tournament=tournament,
            status='PENDING'
        )
        
        updated_count = updated_registrations.update(
            status='REJECTED',
            notes=rejection_reason
        )
        
        return Response({
            'message': f'Successfully rejected {updated_count} participants',
            'rejected_count': updated_count,
            'reason': rejection_reason
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_team_for_tournament(request, tournament_id):
    """Register a team for a tournament"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from teams.services.tournament_validator import TournamentValidator
        from teams.services.player_selector import PlayerSelector
        from accounts.models import CustomUser
        
        tournament = get_object_or_404(Tournament, id=tournament_id)
        
        # Validate tournament supports team registration
        if tournament.registration_type != 'TEAM':
            return Response({
                'error': 'This tournament only accepts individual registrations'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team ID and selected players from request
        team_id = request.data.get('team_id')
        selected_player_ids = request.data.get('selected_players', [])
        
        if not team_id:
            return Response({
                'error': 'Team ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not selected_player_ids:
            return Response({
                'error': 'Selected players are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get team and validate user can register it
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user can register this team (must be owner or leader)
        try:
            membership = TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
            if not membership.can_register_for_tournaments():
                return Response({
                    'error': 'Only team owners and leaders can register teams for tournaments'
                }, status=status.HTTP_403_FORBIDDEN)
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if team is already registered
        if TeamTournamentRegistration.objects.filter(tournament=tournament, team=team).exists():
            return Response({
                'error': 'Team is already registered for this tournament'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate tournament is open for registration
        if not tournament.is_registration_open:
            return Response({
                'error': 'Tournament registration is closed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate team composition using TournamentValidator
        validator = TournamentValidator()
        validation_result = validator.validate_team_composition(team, tournament)
        
        if not validation_result['is_valid']:
            return Response({
                'error': validation_result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate selected players
        selected_players = CustomUser.objects.filter(
            id__in=selected_player_ids,
            role='PLAYER'
        )
        
        if selected_players.count() != len(selected_player_ids):
            return Response({
                'error': 'Some selected players were not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate all selected players are team members
        team_member_ids = set(
            TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).values_list('player_id', flat=True)
        )
        
        selected_player_ids_set = set(selected_player_ids)
        if not selected_player_ids_set.issubset(team_member_ids):
            return Response({
                'error': 'All selected players must be active team members'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate player selection using PlayerSelector
        player_selector = PlayerSelector()
        selection_result = player_selector.validate_player_selection(
            selected_players.values_list('id', flat=True),
            tournament
        )
        
        if not selection_result['is_valid']:
            return Response({
                'error': selection_result['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create team tournament registration
        registration = TeamTournamentRegistration.objects.create(
            tournament=tournament,
            team=team,
            registered_by=request.user,
            status='PENDING'
        )
        
        # Add selected players
        registration.selected_players.set(selected_players)
        
        # Record activity history
        from teams.models import ActivityHistory
        ActivityHistory.objects.create(
            team=team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team registered for tournament: {tournament.title}',
            performed_by=request.user,
            metadata={
                'tournament_id': str(tournament.id),
                'tournament_title': tournament.title,
                'selected_players': len(selected_player_ids)
            }
        )
        
        return Response({
            'message': 'Team registered successfully. Awaiting organizer approval.',
            'registration_id': str(registration.id),
            'tournament': tournament.title,
            'team': team.name,
            'selected_players': len(selected_player_ids),
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Registration failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_available_tournaments(request, team_id):
    """Get available tournaments for a specific team"""
    try:
        from teams.models import Team, TeamMembership, TeamTournamentRegistration
        from django.utils import timezone
        
        # Get team and validate user access
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            return Response({
                'error': 'Team not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member of this team
        try:
            TeamMembership.objects.get(
                team=team,
                player=request.user,
                is_active=True
            )
        except TeamMembership.DoesNotExist:
            return Response({
                'error': 'You are not a member of this team'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get tournaments that:
        # 1. Accept team registration
        # 2. Match team's sport types
        # 3. Are open for registration
        # 4. Team is not already registered for
        
        # Get already registered tournament IDs
        registered_tournament_ids = TeamTournamentRegistration.objects.filter(
            team=team
        ).values_list('tournament_id', flat=True)
        
        # Filter tournaments
        available_tournaments = Tournament.objects.filter(
            registration_type='TEAM',
            sport_type__in=team.sport_types,
            status='UPCOMING',
            registration_deadline__gt=timezone.now()
        ).exclude(
            id__in=registered_tournament_ids
        ).order_by('date', 'start_time')
        
        # Apply additional filters from query params
        sport_filter = request.query_params.get('sport_type')
        if sport_filter:
            available_tournaments = available_tournaments.filter(sport_type=sport_filter)
        
        # Serialize tournaments
        serializer = TournamentSerializer(
            available_tournaments, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'team': {
                'id': str(team.id),
                'name': team.name,
                'sport_types': team.sport_types
            },
            'available_tournaments': serializer.data,
            'total_count': available_tournaments.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to fetch available tournaments: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)