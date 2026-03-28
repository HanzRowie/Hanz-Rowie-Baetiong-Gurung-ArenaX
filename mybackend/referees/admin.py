from django.contrib import admin
from .models import (
    RefereeProfile,
    RefereeAvailability,
    RefereeBooking,
    RefereeRating,
    RefereeMatchReport,
    RefereePaymentRecord
)

@admin.register(RefereeProfile)
class RefereeProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'certification_level', 'sports_specialization', 'years_experience', 'is_verified', 'rating', 'total_matches_officiated')
    list_filter = ('certification_level', 'is_verified', 'sports_specialization')
    search_fields = ('user__full_name', 'user__email', 'license_number')
    ordering = ('user__full_name',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Certification & Experience', {
            'fields': ('certification_level', 'sports_specialization', 'years_experience')
        }),
        ('License Information', {
            'fields': ('license_number', 'license_expiry')
        }),
        ('Verification & Rating', {
            'fields': ('is_verified', 'verification_date', 'rating', 'total_matches_officiated')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(RefereeAvailability)
class RefereeAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('referee', 'available_date', 'start_time', 'end_time', 'is_available')
    list_filter = ('is_available', 'available_date')
    search_fields = ('referee__full_name', 'referee__email')
    ordering = ('available_date', 'start_time')
    date_hierarchy = 'available_date'

    fieldsets = (
        ('Referee & Date', {
            'fields': ('referee', 'available_date')
        }),
        ('Time Slot', {
            'fields': ('start_time', 'end_time')
        }),
        ('Availability', {
            'fields': ('is_available', 'notes')
        })
    )

@admin.register(RefereeBooking)
class RefereeBookingAdmin(admin.ModelAdmin):
    list_display = ('referee', 'match', 'tournament', 'requested_by', 'status', 'match_date', 'fee')
    list_filter = ('status', 'match_date', 'requested_at')
    search_fields = ('referee__full_name', 'requested_by__full_name', 'tournament__title', 'match__id')
    readonly_fields = ('requested_at', 'responded_at')
    ordering = ('-requested_at',)
    date_hierarchy = 'match_date'

    fieldsets = (
        ('Booking Details', {
            'fields': ('referee', 'match', 'tournament', 'requested_by', 'match_date', 'fee')
        }),
        ('Status', {
            'fields': ('status', 'notes')
        }),
        ('Timestamps', {
            'fields': ('requested_at', 'responded_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(RefereeRating)
class RefereeRatingAdmin(admin.ModelAdmin):
    list_display = ('referee', 'organizer', 'match', 'tournament', 'rating', 'is_anonymous', 'created_at')
    list_filter = ('rating', 'is_anonymous', 'created_at')
    search_fields = ('referee__full_name', 'organizer__full_name', 'tournament__title')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Rating Details', {
            'fields': ('referee', 'organizer', 'match', 'tournament', 'rating')
        }),
        ('Additional Info', {
            'fields': ('comment', 'is_anonymous')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )


@admin.register(RefereeMatchReport)
class RefereeMatchReportAdmin(admin.ModelAdmin):
    list_display = ('referee', 'match', 'tournament', 'submitted_at', 'updated_at')
    list_filter = ('submitted_at', 'updated_at')
    search_fields = ('referee__full_name', 'match__id', 'tournament__title')
    readonly_fields = ('submitted_at', 'updated_at')
    ordering = ('-submitted_at',)
    date_hierarchy = 'submitted_at'

    fieldsets = (
        ('Match Information', {
            'fields': ('referee', 'match', 'tournament')
        }),
        ('Match Details', {
            'fields': ('match_duration', 'weather_conditions', 'court_conditions')
        }),
        ('Incident Reporting', {
            'fields': ('incidents', 'penalties_issued', 'notable_events')
        }),
        ('Final Assessment', {
            'fields': ('overall_assessment', 'recommendations')
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(RefereePaymentRecord)
class RefereePaymentRecordAdmin(admin.ModelAdmin):
    list_display = ('referee', 'tournament', 'amount', 'currency', 'payment_status', 'created_at', 'paid_at')
    list_filter = ('payment_status', 'currency', 'created_at', 'paid_at')
    search_fields = ('referee__full_name', 'tournament__title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Payment Information', {
            'fields': ('id', 'referee', 'booking', 'tournament', 'match')
        }),
        ('Amount & Status', {
            'fields': ('amount', 'currency', 'payment_status', 'paid_at')
        }),
        ('Payment Link', {
            'fields': ('payment',)
        }),
        ('Additional Details', {
            'fields': ('description', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
