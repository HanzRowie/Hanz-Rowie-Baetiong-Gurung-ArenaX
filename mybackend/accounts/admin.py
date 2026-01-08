from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Notification, PlayerStatistics, UpcomingMatch, EmailVerification, PasswordResetToken

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'full_name', 'role', 'is_verified', 'is_active', 'created_at')
    list_filter = ('role', 'is_verified', 'is_active', 'is_staff', 'created_at', 'skill_level')
    search_fields = ('username', 'email', 'full_name', 'phone_number')
    ordering = ('-created_at',)

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('full_name', 'phone_number', 'role', 'is_verified', 'profile_picture')
        }),
        ('Profile Details', {
            'fields': ('bio', 'location', 'country', 'date_of_birth', 'gender', 'preferred_sports', 'skill_level', 'achievements', 'social_links', 'is_available_for_matches')
        }),
        ('Statistics', {
            'fields': ('matches_played', 'matches_won', 'win_rate', 'wta_ranking', 'atp_ranking')
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('full_name', 'phone_number', 'role', 'is_verified')
        }),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'title', 'read', 'created_at')
    list_filter = ('notification_type', 'read', 'created_at')
    search_fields = ('user__username', 'user__email', 'title', 'message')
    ordering = ('-created_at',)

@admin.register(PlayerStatistics)
class PlayerStatisticsAdmin(admin.ModelAdmin):
    list_display = ('player', 'year', 'month', 'matches_played', 'matches_won', 'tournaments_participated')
    list_filter = ('year', 'month')
    search_fields = ('player__username', 'player__email', 'player__full_name')
    ordering = ('-year', '-month')

@admin.register(UpcomingMatch)
class UpcomingMatchAdmin(admin.ModelAdmin):
    list_display = ('player', 'tournament_name', 'match_date', 'opponent_name', 'venue')
    list_filter = ('match_date', 'tournament_name')
    search_fields = ('player__username', 'player__email', 'tournament_name', 'opponent_name')
    ordering = ('match_date',)

@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'otp', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('user__username', 'user__email')
    ordering = ('-created_at',)

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('user__username', 'user__email')
    ordering = ('-created_at',)
