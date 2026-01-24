from django.contrib import admin
from .models import OrganizerProfile, OrganizerSubscription, TournamentAnalytics, OrganizerNotification, TournamentTemplate


@admin.register(OrganizerProfile)
class OrganizerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization_name', 'contact_phone', 'is_verified', 'created_at')
    search_fields = ('user__full_name', 'organization_name', 'contact_phone')
    list_filter = ('is_verified', 'created_at')
    ordering = ('-created_at',)


@admin.register(OrganizerSubscription)
class OrganizerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('organizer', 'subscription_type', 'is_active', 'start_date', 'end_date')
    list_filter = ('subscription_type', 'is_active')
    search_fields = ('organizer__full_name',)
    ordering = ('-start_date',)


@admin.register(TournamentAnalytics)
class TournamentAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('organizer', 'tournament', 'total_registrations', 'total_revenue', 'views_count')
    search_fields = ('organizer__full_name', 'tournament__title')
    list_filter = ('tournament',)
    ordering = ('-created_at',)


@admin.register(OrganizerNotification)
class OrganizerNotificationAdmin(admin.ModelAdmin):
    list_display = ('organizer', 'notification_type', 'title', 'priority', 'read', 'created_at')
    list_filter = ('notification_type', 'priority', 'read')
    search_fields = ('organizer__full_name', 'title')
    ordering = ('-created_at',)


@admin.register(TournamentTemplate)
class TournamentTemplateAdmin(admin.ModelAdmin):
    list_display = ('organizer', 'name', 'sport_type', 'tournament_type', 'is_public', 'usage_count')
    list_filter = ('sport_type', 'tournament_type', 'is_public')
    search_fields = ('organizer__full_name', 'name')
    ordering = ('-created_at',)
