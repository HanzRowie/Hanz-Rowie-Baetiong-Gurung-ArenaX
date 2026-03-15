from django.contrib import admin

from .models import Tournament, TournamentRegistration, Match, TournamentRefereeAvailability, PlayerMatchStats, TournamentAuditLog


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('title', 'sport_type', 'tournament_type', 'organizer', 'status', 'date', 'venue_name', 'created_at')
    search_fields = ('title', 'sport_type', 'organizer__full_name', 'venue')
    list_filter = ('sport_type', 'tournament_type', 'status', 'date')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TournamentRegistration)
class TournamentRegistrationAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'player', 'status', 'registered_at')
    search_fields = ('tournament__title', 'player__full_name')
    list_filter = ('status', 'registered_at')
    ordering = ('-registered_at',)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'round_number', 'match_number', 'player1', 'player2', 'winner', 'status', 'scheduled_time')
    search_fields = ('tournament__title', 'player1__full_name', 'player2__full_name')
    list_filter = ('status', 'round_number')
    ordering = ('tournament', 'round_number', 'match_number')


@admin.register(TournamentRefereeAvailability)
class TournamentRefereeAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('referee', 'tournament', 'requested_by', 'status', 'fee', 'requested_at')
    search_fields = ('referee__full_name', 'tournament__title', 'requested_by__full_name')
    list_filter = ('status', 'requested_at')
    ordering = ('-requested_at',)


@admin.register(PlayerMatchStats)
class PlayerMatchStatsAdmin(admin.ModelAdmin):
    list_display = ('player', 'match', 'goals', 'assists', 'created_at')
    search_fields = ('player__full_name', 'match__tournament__title')
    list_filter = ('created_at', 'goals', 'assists')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')



@admin.register(TournamentAuditLog)
class TournamentAuditLogAdmin(admin.ModelAdmin):
    list_display = ('administrator', 'action_type', 'tournament', 'previous_status', 'new_status', 'timestamp')
    search_fields = ('administrator__full_name', 'tournament__title', 'action_type')
    list_filter = ('action_type', 'timestamp', 'previous_status', 'new_status')
    ordering = ('-timestamp',)
    readonly_fields = ('id', 'timestamp')
    
    def has_add_permission(self, request):
        # Audit logs should only be created programmatically
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Audit logs should be immutable
        return False
