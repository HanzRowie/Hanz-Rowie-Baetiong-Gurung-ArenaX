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

        # Create registration
        registration = TournamentRegistration.objects.create(
            tournament=tournament,
            player=user,
            status='ACCEPTED'
        )

        return Response({
            'message': 'Successfully registered for tournament',
            'registration_id': str(registration.id),
            'tournament': tournament.title
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
    
    registrations = TournamentRegistration.objects.filter(tournament=tournament).select_related('player')
    participants = []
    
    for registration in registrations:
        participants.append({
            'id': str(registration.id),
            'user': {
                'id': str(registration.player.id),
                'full_name': registration.player.full_name,
                'email': registration.player.email
            },
            'registration_date': registration.created_at,
            'payment_status': 'paid'  # Simplified for now
        })
    
    return Response(participants, status=status.HTTP_200_OK)

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
