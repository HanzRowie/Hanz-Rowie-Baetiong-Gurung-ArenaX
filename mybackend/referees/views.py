from rest_framework import viewsets, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg
from datetime import datetime, date, timedelta

from accounts.models import CustomUser
from accounts.decorators import jwt_required, role_required
from .models import (
    RefereeProfile, RefereeAvailability, RefereeBooking,
    RefereeRating, RefereeCertification, RefereeMatchReport
)
from .serializers import (
    RefereeProfileSerializer, RefereeAvailabilitySerializer, RefereeBookingSerializer,
    RefereeRatingSerializer, RefereeCertificationSerializer, RefereeMatchReportSerializer
)
from notifications.utils import send_notification

class RefereeProfileViewSet(viewsets.ModelViewSet):
    queryset = RefereeProfile.objects.all()
    serializer_class = RefereeProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RefereeProfile.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referee_dashboard(request):
    """Get comprehensive dashboard data for referees"""
    user = request.user

    if user.role != 'REFEREE':
        return Response({'error': 'Only referees can access this dashboard'}, status=status.HTTP_403_FORBIDDEN)

    # Statistics
    total_bookings = RefereeBooking.objects.filter(referee=user).count()
    accepted_bookings = RefereeBooking.objects.filter(referee=user, status='ACCEPTED').count()
    completed_matches = RefereeBooking.objects.filter(referee=user, status='COMPLETED').count()

    # Average rating
    avg_rating = RefereeRating.objects.filter(referee=user).aggregate(avg=Avg('rating'))['avg'] or 0

    # Upcoming bookings
    upcoming_bookings = RefereeBooking.objects.filter(
        referee=user,
        status__in=['ACCEPTED', 'REQUESTED'],
        match_date__gte=datetime.now()
    ).order_by('match_date')[:5]

    upcoming_data = []
    for booking in upcoming_bookings:
        upcoming_data.append({
            'id': booking.id,
            'tournament_title': booking.tournament.title,
            'match_date': booking.match_date,
            'status': booking.status,
            'fee': float(booking.fee),
        })

    # Recent ratings
    recent_ratings = RefereeRating.objects.filter(referee=user).order_by('-created_at')[:3]

    return Response({
        'statistics': {
            'total_bookings': total_bookings,
            'accepted_bookings': accepted_bookings,
            'completed_matches': completed_matches,
            'average_rating': round(avg_rating, 2),
        },
        'upcoming_bookings': upcoming_data,
        'recent_ratings': RefereeRatingSerializer(recent_ratings, many=True).data,
    }, status=status.HTTP_200_OK)

class RefereeAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = RefereeAvailability.objects.all()
    serializer_class = RefereeAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user is a referee
        if self.request.user.role != 'REFEREE':
            return RefereeAvailability.objects.none()
        return RefereeAvailability.objects.filter(referee=self.request.user)

    def perform_create(self, serializer):
        # Ensure user is a referee
        if self.request.user.role != 'REFEREE':
            raise serializers.ValidationError('Only referees can create availability slots')
        
        # Use get_or_create to handle duplicates
        availability_data = serializer.validated_data
        availability_data['referee'] = self.request.user
        
        availability, created = RefereeAvailability.objects.get_or_create(
            referee=self.request.user,
            available_date=availability_data['available_date'],
            start_time=availability_data.get('start_time'),
            end_time=availability_data.get('end_time'),
            defaults=availability_data
        )
        
        if not created:
            # Update existing record
            for key, value in availability_data.items():
                if key != 'referee':  # Don't update referee field
                    setattr(availability, key, value)
            availability.save()
        
        serializer.instance = availability

class RefereeBookingViewSet(viewsets.ModelViewSet):
    queryset = RefereeBooking.objects.all()
    serializer_class = RefereeBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'REFEREE':
            return RefereeBooking.objects.filter(referee=self.request.user).select_related(
                'tournament', 'match', 'requested_by'
            ).order_by('-requested_at')
        elif self.request.user.role == 'ORGANIZER':
            return RefereeBooking.objects.filter(requested_by=self.request.user).select_related(
                'tournament', 'match', 'referee'
            ).order_by('-requested_at')
        return RefereeBooking.objects.none()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_booking_request(request, booking_id):
    """Referee responds to booking request"""
    booking = get_object_or_404(RefereeBooking, id=booking_id, referee=request.user)

    if booking.status != 'REQUESTED':
        return Response({'error': 'This booking request has already been responded to'}, status=status.HTTP_400_BAD_REQUEST)

    response = request.data.get('response')  # 'accept' or 'decline'
    if response not in ['accept', 'decline']:
        return Response({'error': 'Invalid response. Must be "accept" or "decline"'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'ACCEPTED' if response == 'accept' else 'DECLINED'
    booking.responded_at = datetime.now()
    booking.save()

    # Notify organizer
    status_text = 'accepted' if response == 'accept' else 'declined'
    send_notification(
        user=booking.requested_by,
        notification_type='GENERAL',
        title=f'Referee Booking {status_text.capitalize()}',
        message=f'Referee {request.user.full_name} has {status_text} your booking request for the match on {booking.match_date}.',
        related_id=booking.id,
        action_url=f'/bookings'
    )

    serializer = RefereeBookingSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_referee_booking(request, referee_id, match_id):
    """Organizer requests referee for a match"""
    from tournaments.models import Match, Tournament

    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can request referees'}, status=status.HTTP_403_FORBIDDEN)

    referee = get_object_or_404(CustomUser, id=referee_id, role='REFEREE')
    match = get_object_or_404(Match, id=match_id)

    # Check if booking already exists
    existing_booking = RefereeBooking.objects.filter(referee=referee, match=match).first()
    if existing_booking:
        return Response({'error': 'Booking request already exists for this match'}, status=status.HTTP_400_BAD_REQUEST)

    # Create booking request
    booking = RefereeBooking.objects.create(
        referee=referee,
        match=match,
        tournament=match.tournament,
        requested_by=request.user,
        match_date=datetime.combine(match.scheduled_time.date(), match.scheduled_time.time()) if match.scheduled_time else datetime.now(),
        fee=request.data.get('fee', 0),
        notes=request.data.get('notes', '')
    )

    # Notify referee
    send_notification(
        user=referee,
        notification_type='REFEREE_ASSIGNED',
        title='New Match Request',
        message=f'Organizer {request.user.full_name} has requested you to referee a match on {booking.match_date}.',
        related_id=booking.id,
        action_url=f'/referee/bookings'
    )

    serializer = RefereeBookingSerializer(booking)

    return Response(serializer.data, status=status.HTTP_201_CREATED)

class RefereeRatingViewSet(viewsets.ModelViewSet):
    queryset = RefereeRating.objects.all()
    serializer_class = RefereeRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'REFEREE':
            return RefereeRating.objects.filter(referee=self.request.user)
        elif self.request.user.role == 'ORGANIZER':
            return RefereeRating.objects.filter(organizer=self.request.user)
        return RefereeRating.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'ORGANIZER':
            raise serializers.ValidationError('Only organizers can rate referees')
        serializer.save(organizer=self.request.user)

class RefereeCertificationViewSet(viewsets.ModelViewSet):
    queryset = RefereeCertification.objects.all()
    serializer_class = RefereeCertificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RefereeCertification.objects.filter(referee=self.request.user)

    def perform_create(self, serializer):
        serializer.save(referee=self.request.user)

class RefereeMatchReportViewSet(viewsets.ModelViewSet):
    queryset = RefereeMatchReport.objects.all()
    serializer_class = RefereeMatchReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RefereeMatchReport.objects.filter(referee=self.request.user)

    def perform_create(self, serializer):
        match = serializer.validated_data['match']
        # Check if referee is assigned to this match
        booking = RefereeBooking.objects.filter(
            referee=self.request.user,
            match=match,
            status='COMPLETED'
        ).first()

        if not booking:
            raise serializers.ValidationError('You can only submit reports for matches you officiated')

        serializer.save(referee=self.request.user, tournament=match.tournament)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_referees_for_tournament(request, tournament_id):
    """Get available referees for a specific tournament (post-creation)"""
    from tournaments.models import Tournament
    
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
    
    tournament = get_object_or_404(Tournament, id=tournament_id, organizer=request.user)
    
    # Get tournament date and time
    tournament_date = tournament.date
    tournament_start = tournament.start_time
    tournament_end = tournament.end_time or tournament.start_time  # Fallback if no end time
    
    # Find referees who are available on the tournament date
    available_referees_data = []
    
    # Get all referees
    all_referees = CustomUser.objects.filter(role='REFEREE', is_active=True)
    
    for referee in all_referees:
        # Check if referee has availability for this date
        availability_slots = RefereeAvailability.objects.filter(
            referee=referee,
            available_date=tournament_date,
            is_available=True
        )
        
        # Check if any slot covers the tournament time
        is_available = False
        covering_slot = None
        
        for slot in availability_slots:
            if slot.covers_time_range(tournament_start, tournament_end):
                is_available = True
                covering_slot = slot
                break
        
        # If no specific availability slots, assume available (referee hasn't set restrictions)
        if not availability_slots.exists():
            is_available = True
        
        # Check for conflicting bookings
        if is_available:
            conflicting_bookings = RefereeBooking.objects.filter(
                referee=referee,
                status__in=['REQUESTED', 'ACCEPTED'],
                match_date__date=tournament_date
            )
            
            # Check time overlap for existing bookings
            for booking in conflicting_bookings:
                booking_start = booking.match_date.time()
                booking_end = (booking.match_date + timedelta(hours=2)).time()  # Assume 2-hour matches
                
                # Check if times overlap
                if (tournament_start < booking_end and tournament_end > booking_start):
                    is_available = False
                    break
        
        if is_available:
            # Get referee profile data
            try:
                profile = RefereeProfile.objects.get(user=referee)
                rating = profile.rating
                specialization = profile.sports_specialization
                certification = profile.certification_level
                experience = profile.years_experience
                matches_officiated = profile.total_matches_officiated
            except RefereeProfile.DoesNotExist:
                rating = 0.0
                specialization = []
                certification = 'Not Certified'
                experience = 0
                matches_officiated = 0
            
            # Filter by sport if referee has specializations
            if specialization and tournament.sport_type.upper() not in [s.upper() for s in specialization]:
                continue
            
            available_referees_data.append({
                'id': str(referee.id),
                'name': referee.full_name,
                'email': referee.email,
                'phone_number': referee.phone_number,
                'rating': rating,
                'specialization': specialization,
                'certification_level': certification,
                'years_experience': experience,
                'matches_officiated': matches_officiated,
                'profile_picture': referee.profile_picture.url if referee.profile_picture else None,
                'availability_slot': {
                    'start_time': str(covering_slot.start_time) if covering_slot and covering_slot.start_time else None,
                    'end_time': str(covering_slot.end_time) if covering_slot and covering_slot.end_time else None,
                    'notes': covering_slot.notes if covering_slot else ''
                } if covering_slot else None
            })
    
    # Sort by rating (highest first), then by experience
    available_referees_data.sort(key=lambda x: (-x['rating'], -x['years_experience']))
    
    return Response({
        'tournament': {
            'id': str(tournament.id),
            'title': tournament.title,
            'date': str(tournament.date),
            'start_time': str(tournament.start_time),
            'end_time': str(tournament.end_time) if tournament.end_time else None,
            'sport_type': tournament.sport_type
        },
        'available_referees': available_referees_data,
        'count': len(available_referees_data)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_referee_to_tournament(request, tournament_id):
    """Assign a referee to a tournament"""
    from tournaments.models import Tournament, Match
    
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can assign referees'}, status=status.HTTP_403_FORBIDDEN)
    
    tournament = get_object_or_404(Tournament, id=tournament_id, organizer=request.user)
    referee_id = request.data.get('referee_id')
    notes = request.data.get('notes', '')
    fee = request.data.get('fee', 0)
    
    if not referee_id:
        return Response({'error': 'referee_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    referee = get_object_or_404(CustomUser, id=referee_id, role='REFEREE')
    
    # Check if referee is available (reuse logic from above)
    tournament_date = tournament.date
    tournament_start = tournament.start_time
    tournament_end = tournament.end_time or tournament.start_time
    
    # Check availability
    availability_slots = RefereeAvailability.objects.filter(
        referee=referee,
        available_date=tournament_date,
        is_available=True
    )
    
    is_available = False
    if availability_slots.exists():
        for slot in availability_slots:
            if slot.covers_time_range(tournament_start, tournament_end):
                is_available = True
                break
    else:
        # No specific restrictions, assume available
        is_available = True
    
    if not is_available:
        return Response({'error': 'Referee is not available for this tournament time'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for conflicts
    conflicting_bookings = RefereeBooking.objects.filter(
        referee=referee,
        status__in=['REQUESTED', 'ACCEPTED'],
        match_date__date=tournament_date
    )
    
    for booking in conflicting_bookings:
        booking_start = booking.match_date.time()
        booking_end = (booking.match_date + timedelta(hours=2)).time()
        
        if (tournament_start < booking_end and tournament_end > booking_start):
            return Response({'error': 'Referee has conflicting bookings'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create matches if they don't exist (basic tournament structure)
    matches = Match.objects.filter(tournament=tournament)
    if not matches.exists():
        # Create a basic match structure - you can enhance this based on tournament type
        match = Match.objects.create(
            tournament=tournament,
            round_number=1,
            match_number=1,
            scheduled_time=datetime.combine(tournament_date, tournament_start)
        )
    else:
        match = matches.first()  # Use first match for now
    
    # Create referee booking
    booking = RefereeBooking.objects.create(
        referee=referee,
        match=match,
        tournament=tournament,
        requested_by=request.user,
        match_date=datetime.combine(tournament_date, tournament_start),
        fee=fee,
        notes=notes,
        status='REQUESTED'  # Referee needs to accept
    )
    
    # Create notification for referee
    send_notification(
        user=referee,
        notification_type='REFEREE_ASSIGNED',
        title='New Referee Assignment Request',
        message=f'You have been requested to referee the tournament "{tournament.title}" on {tournament_date}.',
        tournament=tournament,
        related_id=booking.id,
        action_url=f'/referee/bookings'
    )
    
    serializer = RefereeBookingSerializer(booking)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

# Find available referees (for organizers)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_available_referees(request):
    """Find referees available on a specific date"""
    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
    date_param = request.GET.get('date')
    if not date_param:
        return Response({"error": "Date parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        search_date = datetime.strptime(date_param, '%Y-%m-%d').date()
    except ValueError:
        return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

    # Find referees available on this date
    available_referees = RefereeAvailability.objects.filter(
        available_date=search_date,
        is_available=True
    ).select_related('referee')

    referees_data = []
    for availability in available_referees:
        referees_data.append({
            "id": str(availability.referee.id),
            "name": availability.referee.full_name,
            "email": availability.referee.email,
            "phone_number": availability.referee.phone_number,
            "available_date": str(availability.available_date),
            "start_time": str(availability.start_time) if availability.start_time else None,
            "end_time": str(availability.end_time) if availability.end_time else None,
            "profile_picture": availability.referee.profile_picture.url if availability.referee.profile_picture else None
        })

    return Response({"referees": referees_data})