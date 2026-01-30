from django.contrib import admin
from .models import Venue, VenueAvailability, VenueBooking

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'sport_type', 'location', 'capacity', 'price_per_hour', 'is_active')
    list_filter = ('sport_type', 'owner', 'is_active')
    search_fields = ('name', 'location', 'owner__full_name', 'owner__email')
    ordering = ('name',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'owner', 'location', 'sport_type', 'court_size', 'facilities', 'is_active')
        }),
        ('Capacity & Pricing', {
            'fields': ('capacity', 'price_per_hour')
        }),
        ('Operating Schedule', {
            'fields': ('default_opening_time', 'default_closing_time', 'operating_days')
        }),
        ('Media', {
            'fields': ('image',)
        })
    )

@admin.register(VenueAvailability)
class VenueAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('venue', 'date', 'opening_time', 'closing_time', 'is_available')
    list_filter = ('is_available', 'date', 'venue__sport_type')
    search_fields = ('venue__name', 'venue__location')
    ordering = ('date',)
    date_hierarchy = 'date'

    fieldsets = (
        ('Venue & Date', {
            'fields': ('venue', 'date')
        }),
        ('Operating Hours', {
            'fields': ('opening_time', 'closing_time')
        }),
        ('Availability', {
            'fields': ('is_available', 'notes')
        })
    )

@admin.register(VenueBooking)
class VenueBookingAdmin(admin.ModelAdmin):
    list_display = ('user', 'venue', 'date', 'start_time', 'end_time', 'purpose', 'status', 'payment_status', 'amount')
    list_filter = ('status', 'payment_status', 'date', 'venue__sport_type')
    search_fields = ('user__full_name', 'user__email', 'venue__name', 'venue__location', 'purpose')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    date_hierarchy = 'date'

    fieldsets = (
        ('Booking Details', {
            'fields': ('venue', 'user', 'date', 'start_time', 'end_time', 'purpose')
        }),
        ('Status & Payment', {
            'fields': ('status', 'payment_status', 'amount')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('venue', 'user')
