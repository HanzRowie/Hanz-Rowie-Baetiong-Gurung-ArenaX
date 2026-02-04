#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from accounts.models import CustomUser
from teams.models import Team, TeamMembership
from tournaments.models import Tournament, TournamentRegistration
from venues.models import Venue, VenueBooking
from referees.models import RefereeProfile, RefereeAvailability
from chat.models import Message, ChatMessage

print('=== COMPREHENSIVE SEED DATA SUMMARY ===\n')

print('=== USERS CREATED ===')
print(f'Total users: {CustomUser.objects.count()}')
print(f'Players: {CustomUser.objects.filter(role="PLAYER").count()}')
print(f'Organizers: {CustomUser.objects.filter(role="ORGANIZER").count()}')
print(f'Referees: {CustomUser.objects.filter(role="REFEREE").count()}')
print(f'Venue Owners: {CustomUser.objects.filter(role="VENUE_OWNER").count()}')
print(f'Admins: {CustomUser.objects.filter(role="ADMIN").count()}')

print('\n=== SAMPLE PLAYERS ===')
for player in CustomUser.objects.filter(role="PLAYER")[:10]:
    print(f'- {player.full_name} ({player.skill_level}) - {player.preferred_sports} - {player.location}')

print('\n=== TEAMS CREATED ===')
print(f'Total teams: {Team.objects.count()}')
print(f'Total team memberships: {TeamMembership.objects.count()}')
for team in Team.objects.all()[:8]:
    print(f'- {team.name} ({", ".join(team.sport_types)}) - {team.member_count} members - Owner: {team.owner.full_name}')

print('\n=== TOURNAMENTS CREATED ===')
print(f'Total tournaments: {Tournament.objects.count()}')
print(f'Individual tournaments: {Tournament.objects.filter(registration_type="INDIVIDUAL").count()}')
print(f'Team tournaments: {Tournament.objects.filter(registration_type="TEAM").count()}')
print(f'Upcoming tournaments: {Tournament.objects.filter(status="UPCOMING").count()}')
print(f'Completed tournaments: {Tournament.objects.filter(status="COMPLETED").count()}')

print('\nSample tournaments:')
for tournament in Tournament.objects.all()[:6]:
    print(f'- {tournament.title} ({tournament.registration_type}) - {tournament.sport_type} - NPR {tournament.entry_fee} - {tournament.registered_count}/{tournament.max_participants} registered')

print('\n=== VENUES CREATED ===')
print(f'Total venues: {Venue.objects.count()}')
print(f'Total venue bookings: {VenueBooking.objects.count()}')
for venue in Venue.objects.all():
    bookings_count = venue.bookings.count()
    print(f'- {venue.name} ({venue.sport_type}) - NPR {venue.price_per_hour}/hour - {bookings_count} bookings - Owner: {venue.owner.full_name}')

print('\n=== REFEREES CREATED ===')
print(f'Total referee profiles: {RefereeProfile.objects.count()}')
print(f'Total referee availability slots: {RefereeAvailability.objects.count()}')
for profile in RefereeProfile.objects.all():
    availability_count = profile.user.referee_availabilities.count()
    print(f'- {profile.user.full_name} ({profile.certification_level}) - {profile.sports_specialization} - {availability_count} availability slots - Rating: {profile.rating}')

print('\n=== CHAT MESSAGES ===')
print(f'Private messages: {Message.objects.count()}')
print(f'Global chat messages: {ChatMessage.objects.count()}')

print('\n=== TOURNAMENT REGISTRATIONS ===')
print(f'Individual registrations: {TournamentRegistration.objects.count()}')
from teams.models import TeamTournamentRegistration
print(f'Team registrations: {TeamTournamentRegistration.objects.count()}')

print('\n=== SAMPLE TEAM REGISTRATIONS ===')
for reg in TeamTournamentRegistration.objects.all()[:5]:
    print(f'- {reg.team.name} registered for {reg.tournament.title} by {reg.registered_by.full_name} - {reg.selected_player_count} players selected')

print('\n=== NOTIFICATIONS AND CONNECTIONS ===')
from accounts.models import Notification, PlayerJoinRequest
print(f'Notifications: {Notification.objects.count()}')
print(f'Player connection requests: {PlayerJoinRequest.objects.count()}')

print('\n=== SAMPLE LOGIN CREDENTIALS ===')
print('Admin: admin@arenax.com / admin123')
print('Organizers: alex.organizer@arenax.com / organizer123, emma.organizer@arenax.com / organizer123')
print('Referees: john.referee@arenax.com / referee123, sarah.referee@arenax.com / referee123')
print('Venue Owners: david.venue@arenax.com / venue123, lisa.venue@arenax.com / venue123')
print('Players: carlos.silva@arenax.com / player123, maria.garcia@arenax.com / player123, james.brown@arenax.com / player123')
print('(All player accounts use password: player123)')

print('\n=== SEED DATA CREATION COMPLETE ===')
print('Your ArenaX application is now populated with comprehensive test data!')
print('You can now test all features including:')
print('- User registration and login (all user types)')
print('- Team creation and management')
print('- Tournament creation and registration (individual and team-based)')
print('- Venue booking and management')
print('- Referee scheduling and ratings')
print('- Player connections and messaging')
print('- Notifications and activity tracking')