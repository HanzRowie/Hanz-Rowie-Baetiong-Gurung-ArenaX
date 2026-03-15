from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import Venue, VenueBooking, VenueAvailability
from .serializers import VenueSerializer, VenueBookingSerializer, VenueAvailabilitySerializer
from .permissions import ApprovalStatusPermission, filter_venues_by_approval_status
from accounts.decorators import jwt_required
from notifications.utils import send_notification

class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated, ApprovalStatusPermission]

    def perform_create(self, serializer):
        """Set the owner to the current user for venue owners"""
        print(f"PERFORM_CREATE - User: {self.request.user}, Role: {getattr(self.request.user, 'role', 'No role')}")
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        """Custom update method with debug logging"""
        print(f"VENUE UPDATE - User: {request.user}, Data: {request.data}")
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            print(f"VENUE UPDATE ERROR: {str(e)}")
            raise

    def partial_update(self, request, *args, **kwargs):
        """Custom partial update method with debug logging"""
        print(f"VENUE PARTIAL UPDATE - User: {request.user}, Data: {request.data}")
        try:
            return super().partial_update(request, *args, **kwargs)
        except Exception as e:
            print(f"VENUE PARTIAL UPDATE ERROR: {str(e)}")
            raise

    def get_queryset(self):
        # Get base queryset
        queryset = Venue.objects.all()
        
        # Apply approval status filtering
        queryset = filter_venues_by_approval_status(queryset, self.request.user)
        
        # Handle various filter parameters
        location = self.request.query_params.get('location', None)
        sport_type = self.request.query_params.get('sport_type', None)
        capacity_min = self.request.query_params.get('capacity_min', None)
        capacity_max = self.request.query_params.get('capacity_max', None)
        price_min = self.request.query_params.get('price_min', None)
        price_max = self.request.query_params.get('price_max', None)
        search = self.request.query_params.get('search', None)

        if location:
            queryset = queryset.filter(location__icontains=location)
        
        if sport_type:
            # sport_types is a JSONField containing a list of sports
            # Use JSON containment to check if the sport is in the list
            from django.db.models import Q
            sport_upper = sport_type.upper()
            queryset = queryset.filter(
                Q(sport_types__contains=[sport_upper]) |
                Q(sport_types__icontains=sport_type)
            )
        
        if capacity_min:
            try:
                queryset = queryset.filter(capacity__gte=int(capacity_min))
            except ValueError:
                pass
                
        if capacity_max:
            try:
                queryset = queryset.filter(capacity__lte=int(capacity_max))
            except ValueError:
                pass
        
        if price_min:
            try:
                queryset = queryset.filter(price_per_hour__gte=float(price_min))
            except ValueError:
                pass
                
        if price_max:
            try:
                queryset = queryset.filter(price_per_hour__lte=float(price_max))
            except ValueError:
                pass
        
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(location__icontains=search) |
                Q(facilities__icontains=search) |
                Q(sport_type__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        """Override list method to return the expected format"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'venues': serializer.data,
            'count': len(serializer.data)
        })

    def create(self, request, *args, **kwargs):
        """Override create method to add debugging and better error handling"""
        print(f"CREATE REQUEST - User: {request.user}")
        print(f"User authenticated: {request.user.is_authenticated}")
        print(f"User role: {getattr(request.user, 'role', 'No role attribute')}")
        print(f"Request data: {request.data}")
        
        # Check if user is authenticated
        if not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated("Authentication required")
        
        # Check if user has venue owner role
        if not hasattr(request.user, 'role') or request.user.role != 'VENUE_OWNER':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only venue owners can create venues")
        
        return super().create(request, *args, **kwargs)

class VenueAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = VenueAvailability.objects.all()
    serializer_class = VenueAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = VenueAvailability.objects.all()
        venue_id = self.request.query_params.get('venue', None)
        date = self.request.query_params.get('date', None)

        if venue_id:
            queryset = queryset.filter(venue_id=venue_id)
        if date:
            queryset = queryset.filter(date=date)

        # Venue owners can only manage their own venues' availability
        if self.request.user.role == 'VENUE_OWNER':
            queryset = queryset.filter(venue__owner=self.request.user)

        return queryset

    def perform_create(self, serializer):
        # Ensure venue owner can only create availability for their venues
        venue = serializer.validated_data['venue']
        if venue.owner != self.request.user:
            raise PermissionError("You can only manage availability for your own venues")
        serializer.save()

class VenueBookingViewSet(viewsets.ModelViewSet):
    queryset = VenueBooking.objects.all()
    serializer_class = VenueBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'VENUE_OWNER':
            # Venue owners see bookings for their venues
            return VenueBooking.objects.filter(venue__owner=self.request.user)
        else:
            # Regular users see their own bookings
            return VenueBooking.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        booking = self.get_object()
        # Venue owners can update bookings for their venues, regular users can update their own bookings
        if self.request.user.role == 'VENUE_OWNER':
            if booking.venue.owner != self.request.user:
                raise PermissionError("You can only update bookings for your own venues")
        else:
            if booking.user != self.request.user:
                raise PermissionError("You can only update your own bookings")
        serializer.save()

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_venue(request, venue_id):
    """Book a venue - creates booking and initiates payment"""
    try:
        venue = get_object_or_404(Venue, id=venue_id)
        data = request.data
        
        print(f"User: {request.user}")
        print(f"Venue ID: {venue_id}")
        print(f"Booking request data: {data}")

        required_fields = ['date', 'start_time', 'end_time']
        if not all(field in data for field in required_fields):
            missing_fields = [field for field in required_fields if field not in data]
            error_msg = f'Missing required fields: {", ".join(missing_fields)}'
            print(f"Validation error: {error_msg}")
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Validate date format
        try:
            from datetime import datetime
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate time format
        try:
            datetime.strptime(data['start_time'], '%H:%M')
            datetime.strptime(data['end_time'], '%H:%M')
        except ValueError:
            return Response({'error': 'Invalid time format. Use HH:MM'}, status=status.HTTP_400_BAD_REQUEST)

        # Convert strings to time objects for comparison
        from datetime import datetime
        start_time_obj = datetime.strptime(data['start_time'], '%H:%M').time()
        end_time_obj = datetime.strptime(data['end_time'], '%H:%M').time()

        print(f"Checking availability for {data['date']} between {start_time_obj} and {end_time_obj}")

        # Check for availability slots that cover the requested time and are available
        available_slots = VenueAvailability.objects.filter(
            venue=venue,
            date=data['date'],
            is_available=True,
            # The slot must cover the entire requested time
            opening_time__lte=start_time_obj,
            closing_time__gte=end_time_obj
        )

        print(f"Found {available_slots.count()} availability slots covering this time.")
        for slot in available_slots:
            print(f"Slot: {slot.opening_time}-{slot.closing_time}")

        # If no availability slots exist for this venue/date, allow booking (assume venue is available)
        # This is for venues that don't have specific availability slots configured
        has_any_slots_for_day = VenueAvailability.objects.filter(venue=venue, date=data['date']).exists()
        
        print(f"Has any slots for day: {has_any_slots_for_day}")
        
        if has_any_slots_for_day and not available_slots.exists():
            print("Blocking booking: Slots exist for day but none cover requested time.")
            return Response({'error': 'Venue is not available for this time slot'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for conflicting bookings
        print("Checking conflicts with:")
        print(f"Start < {end_time_obj}")
        print(f"End > {start_time_obj}")
        
        conflicting_bookings = VenueBooking.objects.filter(
            venue=venue,
            date=data['date'],
            status__in=['PENDING', 'CONFIRMED']
        ).filter(
            # Check time overlap
            start_time__lt=end_time_obj,
            end_time__gt=start_time_obj
        )

        print(f"Conflicting bookings count: {conflicting_bookings.count()}")
        for conflict in conflicting_bookings:
             print(f"Conflict: {conflict.id} {conflict.start_time}-{conflict.end_time} ({conflict.status})")

        if conflicting_bookings.exists():
            return Response({'error': 'Venue is already booked for this time slot'}, status=status.HTTP_400_BAD_REQUEST)

        # Create booking with PENDING status and payment
        print("Creating booking...")
        
        booking = VenueBooking.objects.create(
            venue=venue,
            user=request.user,
            date=data['date'],
            start_time=start_time_obj,
            end_time=end_time_obj,
            purpose=data.get('purpose', ''),
            notes=data.get('notes', ''),
            status='PENDING',
            payment_status='PENDING'
        )
        print(f"Booking created: {booking.id}, Amount: {booking.amount}")

        # Initiate payment
        from payments.services import VenuePaymentService
        from payments.serializers import PaymentSerializer
        
        payment_service = VenuePaymentService()
        
        # Create payment record
        payment = payment_service.create_payment(
            user=request.user,
            payment_type='VENUE_BOOKING',
            amount=booking.amount,
            currency='NPR',
            venue_booking=booking,
            description=f'Venue booking for {venue.name} on {booking.date}'
        )
        
        # Initiate Khalti payment
        customer_info = {
            'name': request.user.full_name,
            'email': request.user.email,
            'phone': request.user.phone_number or ''
        }
        
        khalti_response = payment_service.initiate_khalti_payment(payment, customer_info)
        
        if 'error' in khalti_response:
            # Delete booking if payment initiation fails
            booking.delete()
            return Response({
                'error': 'Failed to initiate payment',
                'details': khalti_response['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = VenueBookingSerializer(booking)
        
        # Notify venue owner about new booking request
        send_notification(
            user=venue.owner,
            notification_type='BOOKING_REQUESTED',
            title='New Booking Request',
            message=f'{request.user.full_name} has requested to book {venue.name} on {booking.date}.',
            related_id=booking.id,
            action_url=f'/venue-bookings'
        )
        
        # Notify player that request was received
        send_notification(
            user=request.user,
            notification_type='GENERAL',
            title='Booking Request Submitted',
            message=f'Your booking request for {venue.name} on {booking.date} has been submitted.',
            related_id=booking.id,
            action_url=f'/bookings'
        )

        return Response({
            'booking': serializer.data,
            'payment': PaymentSerializer(payment).data,
            'payment_url': khalti_response.get('payment_url'),
            'pidx': khalti_response.get('pidx')
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Booking error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': f'Booking failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    """Cancel a venue booking"""
    booking = get_object_or_404(VenueBooking, id=booking_id)

    # Check permissions
    if booking.user != request.user and booking.venue.owner != request.user:
        return Response({'error': 'You do not have permission to cancel this booking'}, status=status.HTTP_403_FORBIDDEN)

    # Cannot cancel confirmed bookings within 24 hours
    from django.utils import timezone
    from datetime import timedelta, datetime
    
    # Make booking_datetime timezone-aware
    booking_datetime = datetime.combine(booking.date, booking.start_time)
    booking_datetime = timezone.make_aware(booking_datetime)
    
    if booking_datetime - timezone.now() < timedelta(hours=24) and booking.status == 'CONFIRMED':
        return Response({'error': 'Cannot cancel booking within 24 hours'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'CANCELLED'
    booking.save()

    # Notify other party
    if request.user == booking.user:
        # Notify owner
        send_notification(
            user=booking.venue.owner,
            notification_type='BOOKING_CANCELLED',
            title='Booking Cancelled',
            message=f'{request.user.full_name} has cancelled their booking for {booking.venue.name} on {booking.date}.',
            related_id=booking.id
        )
    else:
        # Notify player
        send_notification(
            user=booking.user,
            notification_type='BOOKING_CANCELLED',
            title='Booking Cancelled',
            message=f'Your booking for {booking.venue.name} on {booking.date} has been cancelled by the venue owner.',
            related_id=booking.id
        )

    return Response({'message': 'Booking cancelled successfully'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_booking_payment(request, booking_id):
    """Verify payment for venue booking"""
    try:
        booking = get_object_or_404(VenueBooking, id=booking_id, user=request.user)
        
        # Get payment record
        from payments.models import Payment
        payment = Payment.objects.filter(venue_booking=booking).first()
        if not payment:
            return Response({
                'error': 'No payment found for this booking'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify with Khalti
        from payments.services import VenuePaymentService
        from payments.serializers import PaymentSerializer
        
        payment_service = VenuePaymentService()
        verification = payment_service.verify_payment(payment)
        
        if 'error' in verification:
            return Response({
                'error': 'Payment verification failed',
                'details': verification['error']
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update booking status if payment is completed
        if payment.status == 'COMPLETED':
            booking.status = 'CONFIRMED'
            booking.payment_status = 'COMPLETED'
            booking.save()
            
            # Send confirmation notification
            send_notification(
                user=booking.user,
                notification_type='BOOKING_CONFIRMED',
                title='Venue Booking Confirmed',
                message=f'Your booking at {booking.venue.name} on {booking.date} has been confirmed.'
            )
            
            # Notify venue owner about payment received
            send_notification(
                user=booking.venue.owner,
                notification_type='PAYMENT_RECEIVED',
                title='Payment Received',
                message=f'You have received a payment for the booking at {booking.venue.name} on {booking.date}.',
                related_id=booking.id
            )
        
        return Response({
            'booking': VenueBookingSerializer(booking).data,
            'payment': PaymentSerializer(payment).data,
            'verification': verification
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def venue_availability(request, venue_id):
    """Get availability for a specific venue and date"""
    venue = get_object_or_404(Venue, id=venue_id)
    date = request.query_params.get('date')

    if not date:
        return Response({'error': 'Date parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Get existing bookings for the date
    bookings = VenueBooking.objects.filter(
        venue=venue,
        date=date,
        status__in=['PENDING', 'CONFIRMED']
    ).order_by('start_time')

    # Get availability slots for the date
    availabilities = VenueAvailability.objects.filter(
        venue=venue,
        date=date
    ).order_by('opening_time')

    booking_serializer = VenueBookingSerializer(bookings, many=True)
    availability_serializer = VenueAvailabilitySerializer(availabilities, many=True)

    return Response({
        'venue': VenueSerializer(venue).data,
        'bookings': booking_serializer.data,
        'availabilities': availability_serializer.data,
        'date': date
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_booking(request, booking_id):
    """Approve a venue booking (venue owner only)"""
    booking = get_object_or_404(VenueBooking, id=booking_id)

    # Only venue owner can approve
    if booking.venue.owner != request.user:
        return Response({'error': 'You do not have permission to approve this booking'}, status=status.HTTP_403_FORBIDDEN)

    if booking.status != 'PENDING':
        return Response({'error': 'Only pending bookings can be approved'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'CONFIRMED'
    booking.save()

    # Notify player
    send_notification(
        user=booking.user,
        notification_type='BOOKING_APPROVED',
        title='Booking Approved',
        message=f'Your booking for {booking.venue.name} on {booking.date} has been approved.',
        related_id=booking.id
    )

    serializer = VenueBookingSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_booking(request, booking_id):
    """Reject a venue booking (venue owner only)"""
    booking = get_object_or_404(VenueBooking, id=booking_id)

    # Only venue owner can reject
    if booking.venue.owner != request.user:
        return Response({'error': 'You do not have permission to reject this booking'}, status=status.HTTP_403_FORBIDDEN)

    if booking.status != 'PENDING':
        return Response({'error': 'Only pending bookings can be rejected'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'REJECTED'
    booking.save()

    # Notify player
    send_notification(
        user=booking.user,
        notification_type='BOOKING_REJECTED',
        title='Booking Rejected',
        message=f'Your booking for {booking.venue.name} on {booking.date} has been rejected.',
        related_id=booking.id
    )

    serializer = VenueBookingSerializer(booking)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def venue_earnings(request):
    """Get earnings and transaction history for venue owner"""
    if request.user.role != 'VENUE_OWNER':
        return Response({'error': 'Only venue owners can view earnings'}, status=status.HTTP_403_FORBIDDEN)

    # Get all confirmed and completed payments for owner's venues
    bookings = VenueBooking.objects.filter(
        venue__owner=request.user,
        status='CONFIRMED',
        payment_status='COMPLETED'
    ).order_by('-created_at')

    total_earnings = sum(booking.amount for booking in bookings if booking.amount)

    serializer = VenueBookingSerializer(bookings, many=True)
    return Response({
        'total_earnings': total_earnings,
        'transactions': serializer.data
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_venue_bookings(request):
    """Get venue bookings for current user"""
    if request.user.role == 'VENUE_OWNER':
        # Venue owners see all bookings for their venues
        bookings = VenueBooking.objects.filter(venue__owner=request.user)
        
        # Filter by venue_id if provided
        venue_id = request.query_params.get('venue_id')
        if venue_id:
            bookings = bookings.filter(venue_id=venue_id)
            
    else:
        # Regular users see their own bookings
        bookings = VenueBooking.objects.filter(user=request.user)

    bookings = bookings.order_by('-created_at')
    serializer = VenueBookingSerializer(bookings, many=True)
    return Response({
        'bookings': serializer.data,
        'count': len(serializer.data)
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_venues(request):
    """Get venues owned by the current user with booking statistics"""
    try:
        if request.user.role != 'VENUE_OWNER':
            return Response({'error': 'Only venue owners can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        venues = Venue.objects.filter(owner=request.user)
        serializer = VenueSerializer(venues, many=True)
        
        # Add booking statistics to each venue
        venues_data = list(serializer.data)  # Convert to list to modify
        for venue_data in venues_data:
            venue_id = venue_data['id']
            # Get booking stats for this venue
            from venues.models import VenueBooking
            confirmed_bookings = VenueBooking.objects.filter(
                venue_id=venue_id,
                status__in=['CONFIRMED', 'COMPLETED']
            )
            total_bookings = confirmed_bookings.count()
            total_revenue = sum(booking.amount for booking in confirmed_bookings if booking.amount)
            
            # Add stats to venue data
            venue_data['total_bookings'] = total_bookings
            venue_data['revenue'] = float(total_revenue)
        
        return Response({
            'venues': venues_data,
            'count': len(venues_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"Error in get_my_venues: {traceback.format_exc()}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_venues_for_tournament(request):
    """Get available venues for tournament creation"""
    try:
        date = request.query_params.get('date')
        start_time = request.query_params.get('start_time')
        end_time = request.query_params.get('end_time')
        sport_type = request.query_params.get('sport_type')
        
        if not all([date, start_time, end_time]):
            return Response({'error': 'Date, start_time, and end_time are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert time strings to time objects
        from datetime import datetime
        start_time_obj = datetime.strptime(start_time, '%H:%M').time()
        end_time_obj = datetime.strptime(end_time, '%H:%M').time()
        
        # Get all venues and filter by approval status
        from venues.permissions import filter_venues_by_approval_status
        venues = Venue.objects.all()
        venues = filter_venues_by_approval_status(venues, request.user)
        
        # Filter by sport type if provided
        if sport_type:
            venues = venues.filter(sport_type__iexact=sport_type)
        
        available_venues = []
        
        for venue in venues:
            # Check if venue has availability slots for this date
            has_availability_slots = VenueAvailability.objects.filter(venue=venue, date=date).exists()
            
            if has_availability_slots:
                # Check if the requested time is fully covered by available slots
                # We need to check if there are available slots that collectively cover the entire time range
                available_slots = VenueAvailability.objects.filter(
                    venue=venue,
                    date=date,
                    is_available=True
                ).order_by('opening_time')
                
                # Check if slots cover the entire requested time range
                time_covered = False
                
                # Simple approach: check if any single slot covers the entire range
                for slot in available_slots:
                    if slot.opening_time <= start_time_obj and slot.closing_time >= end_time_obj:
                        time_covered = True
                        break
                
                # If no single slot covers it, check if multiple consecutive slots cover it
                if not time_covered and available_slots.exists():
                    # Sort slots and check for coverage
                    current_time = start_time_obj
                    for slot in available_slots:
                        # If this slot starts at or before current_time and extends beyond it
                        if slot.opening_time <= current_time and slot.closing_time > current_time:
                            current_time = slot.closing_time
                            if current_time >= end_time_obj:
                                time_covered = True
                                break
                
                if not time_covered:
                    continue
            else:
                # If no availability slots exist, assume venue is available (legacy venues)
                pass
            
            # Check for conflicting bookings
            conflicting_bookings = VenueBooking.objects.filter(
                venue=venue,
                date=date,
                status__in=['PENDING', 'CONFIRMED']
            ).filter(
                start_time__lt=end_time_obj,
                end_time__gt=start_time_obj
            )
            
            if not conflicting_bookings.exists():
                available_venues.append(venue)
        
        serializer = VenueSerializer(available_venues, many=True)
        return Response({
            'venues': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def venue_stats(request, venue_id):
    """Get statistics for a specific venue"""
    venue = get_object_or_404(Venue, id=venue_id)
    
    # Check permission
    if request.user != venue.owner:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    bookings = VenueBooking.objects.filter(venue=venue)

    total_bookings = bookings.count()
    total_revenue = bookings.filter(status='CONFIRMED').aggregate(Sum('amount'))['amount__sum'] or 0
    average_rating = 4.2  # Mock rating since Venue model doesn't have rating field

    # Simple occupancy: bookings / (30 days * 10 hours) placeholder formula
    # Real implementation would need total available hours calculation
    occupancy_rate = 0
    if total_bookings > 0:
        occupancy_rate = min(100, (total_bookings * 2 / (30 * 10)) * 100) # Mock calculation

    # Monthly stats
    monthly_stats = bookings.annotate(month=TruncMonth('date')).values('month').annotate(
        bookings=Count('id'),
        revenue=Sum('amount')
    ).order_by('month')

    monthly_stats_list = []
    for m in monthly_stats:
        monthly_stats_list.append({
            'month': m['month'].strftime('%B'),
            'bookings': m['bookings'],
            'revenue': m['revenue'] or 0,
            'occupancy_rate': 0 # Placeholder
        })

    # Popular time slots
    popular_time_slots = bookings.values('start_time').annotate(count=Count('id')).order_by('-count')[:5]
    popular_slots_list = [{'time_slot': str(s['start_time']), 'booking_count': s['count']} for s in popular_time_slots]

    # Sport type breakdown (using venue.sport_type since Venue model only has singular field)
    sport_type_breakdown = {}
    if venue.sport_type:
        sport_type_breakdown[venue.sport_type] = total_bookings
            
    return Response({
        'total_bookings': total_bookings,
        'total_revenue': total_revenue,
        'average_rating': average_rating,
        'occupancy_rate': occupancy_rate,
        'monthly_stats': monthly_stats_list,
        'popular_time_slots': popular_slots_list,
        'sport_type_breakdown': sport_type_breakdown
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def venue_reviews(request, venue_id):
    """Get reviews for a specific venue"""
    venue = get_object_or_404(Venue, id=venue_id)
    
    # Mock reviews data since review system is not implemented yet
    mock_reviews = [
        {
            'id': 1,
            'user': {'name': 'John Doe', 'avatar': None},
            'rating': 5,
            'comment': 'Great venue with excellent facilities!',
            'created_at': '2024-01-15T10:30:00Z'
        },
        {
            'id': 2,
            'user': {'name': 'Jane Smith', 'avatar': None},
            'rating': 4,
            'comment': 'Good location and clean courts.',
            'created_at': '2024-01-10T14:20:00Z'
        }
    ]
    
    return Response({
        'reviews': mock_reviews,
        'count': len(mock_reviews),
        'average_rating': 4.5
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_booking_cost(request, venue_id):
    """Calculate booking cost without creating booking (preview for smooth UX)"""
    try:
        venue = get_object_or_404(Venue, id=venue_id)
        data = request.data
        
        # Validate required fields
        if not all(key in data for key in ['start_time', 'end_time']):
            return Response({
                'error': 'start_time and end_time are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse times
        from datetime import datetime, date as date_class
        start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        
        # Calculate duration
        start_dt = datetime.combine(date_class.today(), start_time)
        end_dt = datetime.combine(date_class.today(), end_time)
        duration_hours = (end_dt - start_dt).total_seconds() / 3600
        
        if duration_hours <= 0:
            return Response({
                'error': 'End time must be after start time'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate costs
        from decimal import Decimal
        base_price = float(venue.price_per_hour) * duration_hours
        service_fee = base_price * 0.05  # 5% service fee
        total = base_price + service_fee
        
        return Response({
            'venue': {
                'id': venue.id,
                'name': venue.name,
                'location': venue.location,
                'price_per_hour': float(venue.price_per_hour),
                'sport_type': venue.sport_type
            },
            'duration_hours': round(duration_hours, 2),
            'breakdown': {
                'base_price': round(base_price, 2),
                'service_fee': round(service_fee, 2),
                'service_fee_percentage': 5,
                'total': round(total, 2),
                'currency': 'NPR'
            },
            'policies': {
                'cancellation': 'Free cancellation up to 48 hours before booking',
                'refund': '100% refund if cancelled 48+ hours before',
                'payment_protection': 'Secure payment via Khalti',
                'instant_confirmation': True
            },
            'formatted': {
                'calculation': f'NPR {venue.price_per_hour:,.0f}/hr × {duration_hours:.1f} hrs = NPR {base_price:,.0f}',
                'total': f'NPR {total:,.0f}'
            }
        })
        
    except ValueError as e:
        return Response({
            'error': f'Invalid time format: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
