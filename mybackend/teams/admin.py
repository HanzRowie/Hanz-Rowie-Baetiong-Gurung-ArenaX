from django.contrib import admin
from .models import (
    Team, TeamMembership, Invitation, ActivityHistory, 
    TeamTournamentRegistration, FutsalScore, FutsalPlayerStat, 
    BadmintonSet, FutsalGoal, FutsalCard, TeamJoinRequest
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'member_count', 'max_size', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'owner__full_name', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'member_count']


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ['team', 'player', 'role', 'joined_at', 'is_active']
    list_filter = ['role', 'is_active', 'joined_at']
    search_fields = ['team__name', 'player__full_name', 'player__email']
    readonly_fields = ['id', 'joined_at']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['team', 'player', 'sender', 'status', 'sent_at', 'expires_at']
    list_filter = ['status', 'sent_at', 'expires_at']
    search_fields = ['team__name', 'player__full_name', 'sender__full_name']
    readonly_fields = ['id', 'sent_at', 'responded_at']


@admin.register(TeamJoinRequest)
class TeamJoinRequestAdmin(admin.ModelAdmin):
    list_display = ['team', 'player', 'status', 'created_at', 'responded_by']
    list_filter = ['status', 'created_at']
    search_fields = ['team__name', 'player__full_name']
    readonly_fields = ['id', 'created_at', 'responded_at']


@admin.register(ActivityHistory)
class ActivityHistoryAdmin(admin.ModelAdmin):
    list_display = ['team', 'event_type', 'performed_by', 'timestamp']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['team__name', 'description', 'performed_by__full_name']
    readonly_fields = ['id', 'timestamp']


@admin.register(TeamTournamentRegistration)
class TeamTournamentRegistrationAdmin(admin.ModelAdmin):
    list_display = ['team', 'tournament', 'registered_by', 'status', 'registered_at']
    list_filter = ['status', 'registered_at']
    search_fields = ['team__name', 'tournament__title', 'registered_by__full_name']
    readonly_fields = ['id', 'registered_at']


@admin.register(FutsalScore)
class FutsalScoreAdmin(admin.ModelAdmin):
    list_display = ['match', 'team', 'goals', 'created_at']
    list_filter = ['created_at']
    search_fields = ['match__id', 'team__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(FutsalPlayerStat)
class FutsalPlayerStatAdmin(admin.ModelAdmin):
    list_display = ['player', 'futsal_score', 'goals', 'assists', 'minutes_played']
    search_fields = ['player__full_name', 'futsal_score__team__name']
    readonly_fields = ['id']


@admin.register(BadmintonSet)
class BadmintonSetAdmin(admin.ModelAdmin):
    list_display = ['match', 'set_number', 'home_score', 'away_score', 'duration']
    list_filter = ['set_number']
    search_fields = ['match__id']
    readonly_fields = ['id']


@admin.register(FutsalGoal)
class FutsalGoalAdmin(admin.ModelAdmin):
    list_display = ['scorer', 'assist_by', 'minute', 'goal_type', 'created_at']
    list_filter = ['goal_type', 'created_at']
    search_fields = ['scorer__full_name', 'assist_by__full_name']
    readonly_fields = ['id', 'created_at']


@admin.register(FutsalCard)
class FutsalCardAdmin(admin.ModelAdmin):
    list_display = ['player', 'card_type', 'reason', 'minute', 'created_at']
    list_filter = ['card_type', 'reason', 'created_at']
    search_fields = ['player__full_name']
    readonly_fields = ['id', 'created_at']
