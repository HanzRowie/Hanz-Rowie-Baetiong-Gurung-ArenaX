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
from accounts.decorators import jwt_required

class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Venue.objects.all()
        
        # Handle various filter parameters
        location = self.request.query_params.get('location', None)
        sport_type = self.request.query_params.get('sport_type', None)
        capacity_min = self.request.query_params.get('capacity_min', None)
        capacity_max = self.request.query_params.get('capacity_max', None)
        price_min = self.request.query_params.get('price_min', None)
        price_max = self.request.query_params.get('price_max', None)
        search = self.request.query_params.get('search', None)

        # The main /venues/ endpoint should show ALL venues for everyone
        # Venue owners have a separate /my-venues/ endpoint for their own venues

        if location:
            queryset = queryset.filter(location__icontains=location)
        
        if sport_type:
            queryset = queryset.filter(sport_type__icontains=sport_type)
        
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

    def perform_create(self, serializer):
        # Set the owner to the current user for venue owners
        if self.request.user.role == 'VENUE_OWNER':
            serializer.save(owner=self.request.user)
        else:
            raise PermissionError("Only venue owners can create venues")

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
    """Book a venue"""
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
            start_time__lte=start_time_obj,
            end_time__gte=end_time_obj
        )

        print(f"Found {available_slots.count()} availability slots covering this time.")
        for slot in available_slots:
            print(f"Slot: {slot.start_time}-{slot.end_time}")

        # If no availability slots exist for this venue/date, allow booking (assume venue is available)
        # This is for venues that don't have specific availability slots configured
        has_any_slots_for_day = VenueAvailability.objects.filter(venue=venue, date=data['date']).exists()
        
        print(f"Has any slots for day: {has_any_slots_for_day}")
        
        if has_any_slots_for_day and not available_slots.exists():
            print("Blocking booking: Slots exist for day but none cover requested time.")
            return Response({'error': 'Venue is not available for this time slot'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for conflicting bookings
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

        # Create booking
        print("Creating booking...")
        
        booking = VenueBooking.objects.create(
            venue=venue,
            user=request.user,
            date=data['date'],
            start_time=start_time_obj,
            end_time=end_time_obj,
            purpose=data.get('purpose', ''),
            notes=data.get('notes', '')
        )
        print(f"Booking created: {booking.id}")

        serializer = VenueBookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
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
    from datetime import timedelta
    booking_datetime = timezone.datetime.combine(booking.date, booking.start_time)
    if booking_datetime - timezone.now() < timedelta(hours=24) and booking.status == 'CONFIRMED':
        return Response({'error': 'Cannot cancel booking within 24 hours'}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'CANCELLED'
    booking.save()

    return Response({'message': 'Booking cancelled successfully'}, status=status.HTTP_200_OK)

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
    ).order_by('start_time')

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
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_venues(request):
    """Get venues owned by the current user"""
    try:
        if request.user.role != 'VENUE_OWNER':
            return Response({'error': 'Only venue owners can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        venues = Venue.objects.filter(owner=request.user)
        serializer = VenueSerializer(venues, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
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
        
        # Get all venues
        venues = Venue.objects.all()
        
        # Filter by sport type if provided
        if sport_type:
            venues = venues.filter(sport_type__iexact=sport_type)
        
        available_venues = []
        
        for venue in venues:
            # Check if venue has availability slots for this date
            has_availability_slots = VenueAvailability.objects.filter(venue=venue, date=date).exists()
            
            if has_availability_slots:
                # Check if there's an available slot that covers the requested time
                available_slots = VenueAvailability.objects.filter(
                    venue=venue,
                    date=date,
                    is_available=True,
                    start_time__lte=start_time,
                    end_time__gte=end_time
                )
                if not available_slots.exists():
                    continue
            
            # Check for conflicting bookings
            conflicting_bookings = VenueBooking.objects.filter(
                venue=venue,
                date=date,
                status__in=['PENDING', 'CONFIRMED']
            ).filter(
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            if not conflicting_bookings.exists():
                available_venues.append(venue)
        
        serializer = VenueSerializer(available_venues, many=True)
        return Response({
            'venues': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
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
    total_revenue = bookings.filter(status='CONFIRMED').aggregate(Sum('total_cost'))['total_cost__sum'] or 0
    average_rating = venue.rating or 0
    
    # Simple occupancy: bookings / (30 days * 10 hours) placeholder formula
    # Real implementation would need total available hours calculation
    occupancy_rate = 0 
    if total_bookings > 0:
        occupancy_rate = min(100, (total_bookings * 2 / (30 * 10)) * 100) # Mock calculation
        
    # Monthly stats
    monthly_stats = bookings.annotate(month=TruncMonth('date')).values('month').annotate(
        bookings=Count('id'),
        revenue=Sum('total_cost')
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
    
    # Sport type breakdown (mock since booking doesn't link sport directly usually, inherits from venue but venue has types)
    # Assuming venue has one primary sport or we count all bookings under it
    sport_type_breakdown = {}
    if venue.sport_types:
        for sport in venue.sport_types:
            sport_type_breakdown[sport] = total_bookings
            
    return Response({
        'total_bookings': total_bookings,
        'total_revenue': total_revenue,
        'average_rating': average_rating,
        'occupancy_rate': occupancy_rate,
        'monthly_stats': monthly_stats_list,
        'popular_time_slots': popular_slots_list,
        'sport_type_breakdown': sport_type_breakdown
    }, status=status.HTTP_200_OK)
