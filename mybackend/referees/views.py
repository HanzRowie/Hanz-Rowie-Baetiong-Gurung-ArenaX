from rest_framework import viewsets, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg, Sum
from datetime import datetime, date, timedelta

from accounts.models import CustomUser
from accounts.decorators import jwt_required, role_required
from .models import (
    RefereeProfile, RefereeAvailability, RefereeBooking,
    RefereeRating, RefereeCertification, RefereeMatchReport,
    RefereeGeneralAvailability, RefereePaymentRecord
)
from .serializers import (
    RefereeProfileSerializer, RefereeAvailabilitySerializer, RefereeBookingSerializer,
    RefereeRatingSerializer, RefereeCertificationSerializer, RefereeMatchReportSerializer,
    RefereeGeneralAvailabilitySerializer, RefereePaymentRecordSerializer
)
from notifications.utils import send_notification

class RefereeProfileViewSet(viewsets.ModelViewSet):
    queryset = RefereeProfile.objects.all()
    serializer_class = RefereeProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RefereeProfile.objects.filter(user=self.request.user)

@api_view(['GET'])
@jwt_required
def referee_dashboard(request):
    """Get comprehensive dashboard data for referees"""
    from accounts.models import CustomUser
    user = CustomUser.objects.get(id=request.user_id)

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

class RefereeGeneralAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = RefereeGeneralAvailability.objects.all()
    serializer_class = RefereeGeneralAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Ensure user is a referee
        if self.request.user.role != 'REFEREE':
            return RefereeGeneralAvailability.objects.none()
        return RefereeGeneralAvailability.objects.filter(referee=self.request.user)

    def perform_create(self, serializer):
        # Ensure user is a referee
        if self.request.user.role != 'REFEREE':
            raise serializers.ValidationError('Only referees can create general availability')
        
        # Use get_or_create to handle duplicates (one per referee)
        general_availability, created = RefereeGeneralAvailability.objects.get_or_create(
            referee=self.request.user,
            defaults={'weekly_pattern': serializer.validated_data.get('weekly_pattern', {})}
        )
        
        if not created:
            # Update existing record
            general_availability.weekly_pattern = serializer.validated_data.get('weekly_pattern', {})
            general_availability.save()
        
        serializer.instance = general_availability

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
@jwt_required
def respond_to_booking_request(request, booking_id):
    """Referee responds to booking request"""
    from accounts.models import CustomUser
    from payments.services import RefereePaymentService
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Get the authenticated user
    user = CustomUser.objects.get(id=request.user_id)
    
    booking = get_object_or_404(RefereeBooking, id=booking_id, referee=user)

    if booking.status != 'REQUESTED':
        return Response({'error': 'This booking request has already been responded to'}, status=status.HTTP_400_BAD_REQUEST)

    response_type = request.data.get('response')  # 'accept' or 'decline'
    if response_type not in ['accept', 'decline']:
        return Response({'error': 'Invalid response. Must be "accept" or "decline"'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'ACCEPTED' if response_type == 'accept' else 'DECLINED'
    booking.responded_at = datetime.now()
    booking.save()

    # Process payment if accepted
    payment_info = None
    if response_type == 'accept' and booking.fee > 0:
        try:
            payment_service = RefereePaymentService()
            
            # Create payment record
            payment = payment_service.process_referee_payment(
                referee_booking=booking,
                organizer=booking.requested_by
            )
            
            # Hold payment in escrow
            payment_service.hold_in_escrow(payment)
            
            payment_info = {
                'payment_id': str(payment.id),
                'amount': float(payment.amount),
                'status': 'HELD_IN_ESCROW',
                'message': 'Payment will be released after match completion'
            }
            
            logger.info(f"Referee payment held in escrow for booking {booking.id}: {payment.amount}")
            
        except Exception as e:
            logger.error(f"Error processing referee payment for booking {booking.id}: {str(e)}")
            payment_info = {'error': 'Payment processing failed'}

    # Refund organizer if referee declined and payment exists and was completed
    # Refresh payment from DB to get latest status
    elif response_type == 'decline' and booking.payment_id:
        booking.refresh_from_db()
        payment = booking.payment
        if payment and payment.status == 'COMPLETED':
            try:
                payment_service = RefereePaymentService()
                payment_service.process_refund(
                    payment,
                    payment.amount,
                    reason='Referee declined the booking request'
                )
                booking.payment_status = 'PENDING'
                booking.save(update_fields=['payment_status'])
                
                payment_info = {
                    'payment_id': str(payment.id),
                    'amount': float(payment.amount),
                    'status': 'REFUNDED',
                    'message': 'Payment has been refunded to the organizer'
                }
                
                logger.info(f"Refund issued to organizer for declined booking {booking.id}: {payment.amount}")
                
                # Notify organizer about the refund
                send_notification(
                    user=booking.requested_by,
                    notification_type='GENERAL',
                    title='Referee Fee Refunded',
                    message=f'Your referee fee of NPR {payment.amount} has been refunded as {user.full_name} declined the booking.',
                    related_id=booking.id,
                    action_url='/payments/history'
                )
                
            except Exception as e:
                logger.error(f"Error processing refund for declined booking {booking.id}: {str(e)}")
                payment_info = {'error': 'Refund processing failed, please contact support'}

    # Notify organizer
    status_text = 'accepted' if response_type == 'accept' else 'declined'
    send_notification(
        user=booking.requested_by,
        notification_type='GENERAL',
        title=f'Referee Booking {status_text.capitalize()}',
        message=f'Referee {user.full_name} has {status_text} your booking request for the match on {booking.match_date}.',
        related_id=booking.id,
        action_url=f'/bookings'
    )

    serializer = RefereeBookingSerializer(booking)
    response_data = serializer.data
    
    if payment_info:
        response_data['payment'] = payment_info
    
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['POST'])
@jwt_required
def request_referee_booking(request, referee_id, match_id):
    """Organizer requests referee for a match"""
    from tournaments.models import Match, Tournament
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)

    if user.role != 'ORGANIZER':
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
        requested_by=user,
        match_date=datetime.combine(match.scheduled_time.date(), match.scheduled_time.time()) if match.scheduled_time else datetime.now(),
        fee=request.data.get('fee', 0),
        notes=request.data.get('notes', '')
    )

    # Notify referee
    send_notification(
        user=referee,
        notification_type='REFEREE_ASSIGNED',
        title='New Match Request',
        message=f'Organizer {user.full_name} has requested you to referee a match on {booking.match_date}.',
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


class RefereePaymentRecordViewSet(viewsets.ModelViewSet):
    queryset = RefereePaymentRecord.objects.all()
    serializer_class = RefereePaymentRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'REFEREE':
            return RefereePaymentRecord.objects.filter(referee=user).select_related(
                'tournament', 'match', 'booking', 'payment'
            )
        elif user.role == 'ORGANIZER':
            # Organizers can see payments for their tournaments
            return RefereePaymentRecord.objects.filter(
                tournament__organizer=user
            ).select_related('referee', 'tournament', 'match', 'booking', 'payment')
        elif user.role == 'ADMIN':
            return RefereePaymentRecord.objects.all().select_related(
                'referee', 'tournament', 'match', 'booking', 'payment'
            )
        return RefereePaymentRecord.objects.none()

    def perform_create(self, serializer):
        # Only admins and organizers can create payment records
        if self.request.user.role not in ['ADMIN', 'ORGANIZER']:
            raise serializers.ValidationError('Only admins and organizers can create payment records')
        serializer.save()

@api_view(['GET'])
@jwt_required
def available_referees_for_tournament(request, tournament_id):
    """Get available referees for a specific tournament (post-creation)"""
    from tournaments.models import Tournament
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
    
    tournament = get_object_or_404(Tournament, id=tournament_id, organizer=user)
    
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
        
        # If no explicit availability slots exist, check general availability pattern
        if not availability_slots.exists():
            try:
                general_availability = RefereeGeneralAvailability.objects.get(referee=referee)
                is_available = general_availability.is_available_on_date(
                    tournament_date, 
                    tournament_start, 
                    tournament_end
                )
                # Create a virtual slot for display purposes
                if is_available:
                    day_name = tournament_date.strftime('%A').lower()
                    day_settings = general_availability.weekly_pattern.get(day_name, {})
                    covering_slot = type('obj', (object,), {
                        'start_time': day_settings.get('start_time'),
                        'end_time': day_settings.get('end_time'),
                        'notes': 'Based on general availability'
                    })()
            except RefereeGeneralAvailability.DoesNotExist:
                is_available = False
        
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
                default_fee_per_match = float(profile.default_fee_per_match)
                default_fee_per_session = float(profile.default_fee_per_session)
            except RefereeProfile.DoesNotExist:
                rating = 0.0
                specialization = []
                certification = 'Not Certified'
                experience = 0
                matches_officiated = 0
                default_fee_per_match = 0
                default_fee_per_session = 0
            
            # STRICT FILTER: Only show referees with matching sport specialization
            # Referees MUST have the tournament's sport type in their specialization list
            if not specialization or tournament.sport_type.upper() not in [s.upper() for s in specialization]:
                continue
            
            # Check if this referee has already been requested for this tournament
            existing_booking = RefereeBooking.objects.filter(
                referee=referee,
                tournament=tournament
            ).first()
            
            booking_info = None
            if existing_booking:
                booking_info = {
                    'status': existing_booking.status,
                    'requested_at': existing_booking.requested_at.isoformat(),
                    'fee': float(existing_booking.fee) if existing_booking.fee else 0,
                    'notes': existing_booking.notes
                }
            
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
                'default_fee_per_match': default_fee_per_match,
                'default_fee_per_session': default_fee_per_session,
                'profile_picture': referee.profile_picture.url if referee.profile_picture else None,
                'availability_slot': {
                    'start_time': str(covering_slot.start_time) if covering_slot and covering_slot.start_time else None,
                    'end_time': str(covering_slot.end_time) if covering_slot and covering_slot.end_time else None,
                    'notes': covering_slot.notes if covering_slot else ''
                } if covering_slot else None,
                'booking_status': booking_info
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
@jwt_required
def assign_referee_to_tournament(request, tournament_id):
    """Assign a referee to a tournament"""
    from tournaments.models import Tournament, Match
    from accounts.models import CustomUser
    from payments.services import RefereePaymentService
    import logging
    
    logger = logging.getLogger(__name__)
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can assign referees'}, status=status.HTTP_403_FORBIDDEN)
    
    tournament = get_object_or_404(Tournament, id=tournament_id, organizer=user)

    # Block assignment to unapproved tournaments
    if tournament.approval_status != 'APPROVED':
        return Response(
            {'error': 'Cannot assign referees to a tournament that has not been approved by admin.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Block modifications to completed or cancelled tournaments
    if tournament.status in ('COMPLETED', 'CANCELLED'):
        return Response(
            {'error': f'Cannot assign referees to a {tournament.status.lower()} tournament.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Block assignment to tournaments that have already passed
    from django.utils import timezone as tz
    tournament_datetime = datetime.combine(tournament.date, tournament.start_time)
    if tournament_datetime < datetime.now():
        return Response(
            {'error': 'Cannot assign referees to a tournament that has already taken place.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    referee_id = request.data.get('referee_id')
    notes = request.data.get('notes', '')
    fee = request.data.get('fee', 0)
    
    if not referee_id:
        return Response({'error': 'referee_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    referee = get_object_or_404(CustomUser, id=referee_id, role='REFEREE')
    
    # VALIDATE: Check if referee has the required sport specialization
    try:
        referee_profile = RefereeProfile.objects.get(user=referee)
        if not referee_profile.has_sport_specialization(tournament.sport_type):
            return Response({
                'error': f'This referee is not specialized in {tournament.sport_type}. Only referees with matching sport specialization can be assigned.',
                'referee_specializations': referee_profile.sports_specialization,
                'required_sport': tournament.sport_type
            }, status=status.HTTP_400_BAD_REQUEST)
    except RefereeProfile.DoesNotExist:
        return Response({
            'error': 'Referee profile not found. Cannot verify sport specialization.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    tournament_date = tournament.date
    tournament_start = tournament.start_time
    
    # Check if referee is already booked for this tournament
    existing_booking = RefereeBooking.objects.filter(
        referee=referee,
        tournament=tournament
    ).first()
    if existing_booking:
        serializer = RefereeBookingSerializer(existing_booking)
        return Response(
            {'error': 'This referee has already been requested for this tournament', 'existing_booking': serializer.data},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get the first match if available (optional)
    match = Match.objects.filter(tournament=tournament).first()
    
    # Create referee booking
    booking = RefereeBooking.objects.create(
        referee=referee,
        match=match,  # May be None if bracket not generated yet
        tournament=tournament,
        requested_by=user,
        match_date=datetime.combine(tournament_date, tournament_start),
        fee=fee,
        notes=notes,
        status='REQUESTED'  # Referee needs to accept
    )
    
    # If there's a fee, create payment and initiate Khalti payment
    payment_info = None
    if fee > 0:
        try:
            payment_service = RefereePaymentService()
            
            # Create payment record
            payment = payment_service.process_referee_payment(
                referee_booking=booking,
                organizer=user
            )
            
            # Initiate Khalti payment
            customer_info = {
                'name': user.full_name,
                'email': user.email,
                'phone': user.phone_number or ''
            }
            
            khalti_response = payment_service.initiate_khalti_payment(payment, customer_info)
            
            if 'error' not in khalti_response:
                payment_info = {
                    'payment_id': str(payment.id),
                    'amount': float(payment.amount),
                    'payment_url': khalti_response.get('payment_url'),
                    'pidx': khalti_response.get('pidx')
                }
                
                logger.info(f"Payment initiated for referee booking {booking.id}: {payment.amount}")
            else:
                logger.error(f"Khalti payment initiation failed: {khalti_response['error']}")
                # Don't fail the booking, just log the error
                payment_info = {'error': 'Payment initiation failed'}
                
        except Exception as e:
            logger.error(f"Error creating payment for referee booking {booking.id}: {str(e)}")
            # Don't fail the booking, just log the error
            payment_info = {'error': str(e)}
    
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
    response_data = serializer.data
    
    # Add payment info to response if payment was created
    if payment_info:
        response_data['payment'] = payment_info
    
    return Response(response_data, status=status.HTTP_201_CREATED)

# Find available referees (for organizers)
@api_view(['GET'])
@jwt_required
def find_available_referees(request):
    """Find referees available on a specific date"""
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role != 'ORGANIZER':
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


@api_view(['POST'])
@jwt_required
def complete_match_and_release_payment(request, booking_id):
    """Mark match as completed and release payment to referee"""
    from accounts.models import CustomUser
    from payments.services import RefereePaymentService
    import logging
    
    logger = logging.getLogger(__name__)
    user = CustomUser.objects.get(id=request.user_id)
    
    booking = get_object_or_404(RefereeBooking, id=booking_id)
    
    # Check if user is the organizer who requested the booking
    if user != booking.requested_by:
        return Response({
            'error': 'Only the organizer who requested this booking can complete it'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if booking is in accepted status
    if booking.status != 'ACCEPTED':
        return Response({
            'error': 'Booking must be in ACCEPTED status to complete'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark booking as completed
    booking.status = 'COMPLETED'
    booking.save()
    
    # Release payment if exists
    payment_info = None
    if booking.payment and not booking.payment_released:
        try:
            payment_service = RefereePaymentService()
            payment_service.release_to_referee(booking)
            
            payment_info = {
                'payment_id': str(booking.payment.id),
                'amount': float(booking.payment.amount),
                'status': 'RELEASED',
                'released_at': booking.payment_released_at.isoformat() if booking.payment_released_at else None
            }
            
            logger.info(f"Payment released to referee for booking {booking.id}: {booking.payment.amount}")
            
        except Exception as e:
            logger.error(f"Error releasing payment for booking {booking.id}: {str(e)}")
            return Response({
                'error': f'Failed to release payment: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Notify referee about match completion
    send_notification(
        user=booking.referee,
        notification_type='GENERAL',
        title='Match Completed',
        message=f'Your match for {booking.tournament.title} has been marked as completed.',
        related_id=booking.id,
        action_url='/referee/bookings'
    )
    
    serializer = RefereeBookingSerializer(booking)
    response_data = serializer.data
    
    if payment_info:
        response_data['payment'] = payment_info
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@jwt_required
def referee_earnings(request):
    """Get referee earnings summary"""
    from accounts.models import CustomUser
    from payments.services import RefereePaymentService
    from datetime import datetime
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role != 'REFEREE':
        return Response({
            'error': 'Only referees can view earnings'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get date range from query params
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    
    payment_service = RefereePaymentService()
    earnings = payment_service.calculate_referee_earnings(
        referee=user,
        start_date=start_date,
        end_date=end_date
    )
    
    return Response(earnings, status=status.HTTP_200_OK)


@api_view(['GET'])
@jwt_required
def referee_payment_summary(request):
    """Get comprehensive payment summary for referee"""
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role != 'REFEREE':
        return Response({
            'error': 'Only referees can view payment summary'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get all payment records
    payment_records = RefereePaymentRecord.objects.filter(referee=user)
    
    # Calculate totals
    total_earned = payment_records.filter(payment_status='PAID').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    pending_amount = payment_records.filter(payment_status='PENDING').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    held_in_escrow = payment_records.filter(payment_status='HELD_IN_ESCROW').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    # Get recent payments
    recent_payments = payment_records.order_by('-created_at')[:10]
    
    # Group by status
    by_status = {}
    for status_choice in RefereePaymentRecord.PAYMENT_STATUS_CHOICES:
        status_code = status_choice[0]
        count = payment_records.filter(payment_status=status_code).count()
        amount = payment_records.filter(payment_status=status_code).aggregate(
            total=Sum('amount')
        )['total'] or 0
        by_status[status_code] = {
            'count': count,
            'amount': float(amount),
            'label': status_choice[1]
        }
    
    return Response({
        'summary': {
            'total_earned': float(total_earned),
            'pending_amount': float(pending_amount),
            'held_in_escrow': float(held_in_escrow),
            'total_payments': payment_records.count(),
        },
        'by_status': by_status,
        'recent_payments': RefereePaymentRecordSerializer(recent_payments, many=True).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@jwt_required
def create_referee_payment_record(request):
    """Create a payment record for a referee (Organizer/Admin only)"""
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role not in ['ORGANIZER', 'ADMIN']:
        return Response({
            'error': 'Only organizers and admins can create payment records'
        }, status=status.HTTP_403_FORBIDDEN)
    
    referee_id = request.data.get('referee_id')
    booking_id = request.data.get('booking_id')
    tournament_id = request.data.get('tournament_id')
    match_id = request.data.get('match_id')
    amount = request.data.get('amount')
    description = request.data.get('description', '')
    notes = request.data.get('notes', '')
    
    if not referee_id or not amount:
        return Response({
            'error': 'referee_id and amount are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    referee = get_object_or_404(CustomUser, id=referee_id, role='REFEREE')
    
    # Get related objects
    booking = None
    tournament = None
    match = None
    
    if booking_id:
        from .models import RefereeBooking
        booking = get_object_or_404(RefereeBooking, id=booking_id)
        tournament = booking.tournament
        match = booking.match
    elif tournament_id:
        from tournaments.models import Tournament
        tournament = get_object_or_404(Tournament, id=tournament_id)
    
    if match_id:
        from tournaments.models import Match
        match = get_object_or_404(Match, id=match_id)
    
    # Create payment record
    payment_record = RefereePaymentRecord.objects.create(
        referee=referee,
        booking=booking,
        tournament=tournament,
        match=match,
        amount=amount,
        description=description,
        notes=notes,
        payment_status='PENDING'
    )
    
    # Notify referee
    send_notification(
        user=referee,
        notification_type='GENERAL',
        title='New Payment Record',
        message=f'A payment of {amount} has been recorded for your services.',
        related_id=str(payment_record.id),
        action_url='/referee/payments'
    )
    
    serializer = RefereePaymentRecordSerializer(payment_record)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@jwt_required
def mark_payment_as_paid(request, payment_record_id):
    """Mark a payment record as paid (Organizer/Admin only)"""
    from accounts.models import CustomUser
    
    user = CustomUser.objects.get(id=request.user_id)
    
    if user.role not in ['ORGANIZER', 'ADMIN']:
        return Response({
            'error': 'Only organizers and admins can mark payments as paid'
        }, status=status.HTTP_403_FORBIDDEN)
    
    payment_record = get_object_or_404(RefereePaymentRecord, id=payment_record_id)
    
    # If organizer, verify they own the tournament
    if user.role == 'ORGANIZER' and payment_record.tournament:
        if payment_record.tournament.organizer != user:
            return Response({
                'error': 'You can only mark payments for your own tournaments'
            }, status=status.HTTP_403_FORBIDDEN)
    
    payment_record.payment_status = 'PAID'
    payment_record.paid_at = datetime.now()
    payment_record.save()
    
    # Notify referee
    send_notification(
        user=payment_record.referee,
        notification_type='GENERAL',
        title='Payment Received',
        message=f'Your payment of {payment_record.amount} {payment_record.currency} has been marked as paid.',
        related_id=str(payment_record.id),
        action_url='/referee/payments'
    )
    
    serializer = RefereePaymentRecordSerializer(payment_record)
    return Response(serializer.data, status=status.HTTP_200_OK)
