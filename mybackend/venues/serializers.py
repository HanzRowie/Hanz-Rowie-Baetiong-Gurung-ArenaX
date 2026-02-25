from rest_framework import serializers
from .models import Venue, VenueBooking, VenueAvailability
from accounts.models import CustomUser

# User serializer for booking details
class BookingUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='full_name', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'name', 'email', 'phone_number', 'full_name']

# Venue serializer for booking details
class BookingVenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ['id', 'name', 'location', 'sport_type', 'capacity', 'price_per_hour']

# Venue Serializer
class VenueSerializer(serializers.ModelSerializer):
    owner = BookingUserSerializer(read_only=True)
    sport_types = serializers.SerializerMethodField()
    description = serializers.CharField(source='facilities', required=False, allow_blank=True)
    amenities = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    
    class Meta:
        model = Venue
        fields = ['id', 'owner', 'name', 'description', 'location', 'capacity', 
                 'price_per_hour', 'sport_types', 'sport_type', 'court_size', 
                 'facilities', 'amenities', 'rating', 'image', 'is_active',
                 'default_opening_time', 'default_closing_time', 'operating_days']
        read_only_fields = ['owner']
    
    def get_sport_types(self, obj):
        """Convert single sport_type to array for frontend compatibility"""
        if obj.sport_type:
            return [obj.sport_type.lower()]
        return []
    
    def get_amenities(self, obj):
        """Return mock amenities for now"""
        amenities = []
        if obj.facilities:
            # Extract amenities from facilities text
            if 'air conditioning' in obj.facilities.lower():
                amenities.append('Air Conditioning')
            if 'parking' in obj.facilities.lower():
                amenities.append('Parking')
            if 'changing room' in obj.facilities.lower():
                amenities.append('Changing Rooms')
            if 'equipment' in obj.facilities.lower():
                amenities.append('Equipment Rental')
            if 'lighting' in obj.facilities.lower() or 'floodlight' in obj.facilities.lower():
                amenities.append('Professional Lighting')
        return amenities or ['Basic Facilities']
    
    def get_rating(self, obj):
        """Return mock rating for now"""
        return 4.2  # Mock rating

# Venue Availability Serializer
class VenueAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = VenueAvailability
        fields = '__all__'

# Venue Booking Serializer
class VenueBookingSerializer(serializers.ModelSerializer):
    booker = BookingUserSerializer(source='user', read_only=True)
    venue_details = BookingVenueSerializer(source='venue', read_only=True)
    booking_date = serializers.DateField(source='date', read_only=True)
    total_hours = serializers.SerializerMethodField()
    total_cost = serializers.DecimalField(source='amount', max_digits=8, decimal_places=2, read_only=True)
    payment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = VenueBooking
        fields = ['id', 'venue', 'venue_details', 'user', 'booker', 'date', 'booking_date', 
                 'start_time', 'end_time', 'purpose', 'total_hours', 'total_cost', 'amount', 'status', 
                 'payment_status', 'payment_details', 'notes', 'created_at']
    
    def get_total_hours(self, obj):
        if obj.start_time and obj.end_time:
            from datetime import datetime, date
            start = datetime.combine(date.today(), obj.start_time)
            end = datetime.combine(date.today(), obj.end_time)
            duration_hours = (end - start).total_seconds() / 3600
            return duration_hours
        return 0
    
    def get_payment_details(self, obj):
        """Include payment information for venue owners"""
        try:
            from payments.models import Payment
            payment = Payment.objects.filter(venue_booking=obj).first()
            if payment:
                return {
                    'payment_id': str(payment.id),
                    'amount': str(payment.amount),
                    'currency': payment.currency,
                    'status': payment.status,
                    'payment_type': payment.payment_type,
                    'transaction_id': payment.transaction_id,
                    'payment_processor': payment.payment_processor,
                    'created_at': payment.created_at,
                    'processed_at': payment.processed_at,
                }
            return None
        except Exception:
            return None
