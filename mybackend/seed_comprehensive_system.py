#!/usr/bin/env python
"""
Comprehensive Seed Data Script for ArenaX
Creates realistic test data for all features systematically
"""

import os
import sys
import django
from datetime import datetime, timedelta, time
from decimal import Decimal
from django.utils import timezone
import random

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendapi.settings')
django.setup()

from accounts.models import CustomUser, Notification, PlayerStatistics, UpcomingMatch
from tournaments.models import Tournament, TournamentRegistration, Match, PlayerMatchStats
from teams.models import (
    Team, TeamMembership, Invitation, ActivityHistory,
    TeamTournamentRegistration, FutsalScore, FutsalPlayerStat,
    BadmintonSet, FutsalGoal, FutsalCard
)
from venues.models import Venue, VenueAvailability, VenueBooking
from referees.models import (
    RefereeProfile, RefereeAvailability, RefereeBooking,
    RefereeRating, RefereeCertification
)
from chat.models import Message as ChatMessage

print("=" * 80)
print("ArenaX Comprehensive Seed Data Generator")
print("=" * 80)
print()

# Clear existing data
print("🗑️  Clearing existing data...")
CustomUser.objects.all().delete()
Tournament.objects.all().delete()
Team.objects.all().delete()
Venue.objects.all().delete()
print("✅ Database cleared\n")

# ============================================================================
# STEP 1: CREATE USERS
# ============================================================================
print("👥 STEP 1: Creating Users")
print("-" * 80)

users = {}

# Admin
print("Creating Admin...")
users['admin'] = CustomUser.objects.create_user(
    username='admin',
    email='admin@arenax.com',
    password='admin123',
    full_name='System Administrator',
    phone_number='+1234567890',
    role='ADMIN',
    is_verified=True,
    is_staff=True,
    is_superuser=True
)
print(f"✅ Admin created: {users['admin'].email}")

# Organizers
print("\nCreating Organizers...")
organizers_data = [
    {
        'username': 'alex_organizer',
        'email': 'alex.organizer@arenax.com',
        'full_name': 'Alex Rodriguez',
        'phone': '+1555001001',
        'location': 'Miami, FL',
        'bio': 'Professional futsal tournament organizer with 10+ years experience'
    },
    {
        'username': 'emma_organizer',
        'email': 'emma.organizer@arenax.com',
        'full_name': 'Emma Thompson',
        'phone': '+1555001002',
        'location': 'Seattle, WA',
        'bio': 'Badminton tournament specialist and event coordinator'
    }
]

for org_data in organizers_data:
    user = CustomUser.objects.create_user(
        username=org_data['username'],
        email=org_data['email'],
        password='organizer123',
        full_name=org_data['full_name'],
        phone_number=org_data['phone'],
        role='ORGANIZER',
        is_verified=True,
        location=org_data['location'],
        bio=org_data['bio']
    )
    users[org_data['username']] = user
    print(f"✅ Organizer: {user.full_name} ({user.email})")

# Venue Owners
print("\nCreating Venue Owners...")
venue_owners_data = [
    {
        'username': 'david_venue',
        'email': 'david.venue@arenax.com',
        'full_name': 'David Chen',
        'phone': '+1555002001',
        'business': 'Elite Sports Complex',
        'location': 'San Francisco, CA'
    },
    {
        'username': 'lisa_venue',
        'email': 'lisa.venue@arenax.com',
        'full_name': 'Lisa Martinez',
        'phone': '+1555002002',
        'business': 'Metro Sports Center',
        'location': 'Boston, MA'
    }
]

for vo_data in venue_owners_data:
    user = CustomUser.objects.create_user(
        username=vo_data['username'],
        email=vo_data['email'],
        password='venue123',
        full_name=vo_data['full_name'],
        phone_number=vo_data['phone'],
        role='VENUE_OWNER',
        is_verified=True,
        business_name=vo_data['business'],
        location=vo_data['location']
    )
    users[vo_data['username']] = user
    print(f"✅ Venue Owner: {user.full_name} - {user.business_name}")

# Referees
print("\nCreating Referees...")
referees_data = [
    {
        'username': 'john_referee',
        'email': 'john.referee@arenax.com',
        'full_name': 'John Smith',
        'phone': '+1555003001',
        'location': 'New York, NY',
        'cert_level': 'LEVEL_3',
        'sports': ['FUTSAL'],
        'experience': 12
    },
    {
        'username': 'sarah_referee',
        'email': 'sarah.referee@arenax.com',
        'full_name': 'Sarah Johnson',
        'phone': '+1555003002',
        'location': 'Los Angeles, CA',
        'cert_level': 'LEVEL_4',
        'sports': ['BADMINTON'],
        'experience': 8
    },
    {
        'username': 'mike_referee',
        'email': 'mike.referee@arenax.com',
        'full_name': 'Mike Wilson',
        'phone': '+1555003003',
        'location': 'Chicago, IL',
        'cert_level': 'LEVEL_2',
        'sports': ['FUTSAL', 'BADMINTON'],
        'experience': 5
    }
]

for ref_data in referees_data:
    user = CustomUser.objects.create_user(
        username=ref_data['username'],
        email=ref_data['email'],
        password='referee123',
        full_name=ref_data['full_name'],
        phone_number=ref_data['phone'],
        role='REFEREE',
        is_verified=True,
        location=ref_data['location']
    )
    users[ref_data['username']] = user
    
    # Create referee profile
    profile = RefereeProfile.objects.create(
        user=user,
        certification_level=ref_data['cert_level'],
        sports_specialization=ref_data['sports'],
        years_experience=ref_data['experience'],
        is_verified=True,
        rating=random.uniform(4.0, 5.0),
        total_matches_officiated=random.randint(50, 200)
    )
    print(f"✅ Referee: {user.full_name} - {ref_data['cert_level']} ({', '.join(ref_data['sports'])})")

# Players
print("\nCreating Players...")
players_data = [
    # Professional Players
    {'name': 'James Brown', 'email': 'james.brown@arenax.com', 'sports': ['FUTSAL', 'BADMINTON'], 'skill': 'PROFESSIONAL', 'location': 'New York, NY'},
    {'name': 'Michael Johnson', 'email': 'michael.johnson@arenax.com', 'sports': ['FUTSAL'], 'skill': 'PROFESSIONAL', 'location': 'Los Angeles, CA'},
    {'name': 'Lucas Thompson', 'email': 'lucas.thompson@arenax.com', 'sports': ['BADMINTON'], 'skill': 'PROFESSIONAL', 'location': 'Chicago, IL'},
    {'name': 'Camila Rossi', 'email': 'camila.rossi@arenax.com', 'sports': ['FUTSAL'], 'skill': 'PROFESSIONAL', 'location': 'Miami, FL'},
    {'name': 'Liam O\'Connor', 'email': 'liam.oconnor@arenax.com', 'sports': ['FUTSAL'], 'skill': 'PROFESSIONAL', 'location': 'Boston, MA'},
    
    # Advanced Players
    {'name': 'Carlos Silva', 'email': 'carlos.silva@arenax.com', 'sports': ['FUTSAL'], 'skill': 'ADVANCED', 'location': 'Houston, TX'},
    {'name': 'Roberto Martinez', 'email': 'roberto.martinez@arenax.com', 'sports': ['FUTSAL'], 'skill': 'ADVANCED', 'location': 'Phoenix, AZ'},
    {'name': 'Elena Rodriguez', 'email': 'elena.rodriguez@arenax.com', 'sports': ['BADMINTON'], 'skill': 'ADVANCED', 'location': 'Seattle, WA'},
    {'name': 'Ahmed Hassan', 'email': 'ahmed.hassan@arenax.com', 'sports': ['FUTSAL'], 'skill': 'ADVANCED', 'location': 'Dallas, TX'},
    {'name': 'Fatima Al-Zahra', 'email': 'fatima.alzahra@arenax.com', 'sports': ['FUTSAL', 'BADMINTON'], 'skill': 'ADVANCED', 'location': 'San Diego, CA'},
    
    # Intermediate Players
    {'name': 'Maria Garcia', 'email': 'maria.garcia@arenax.com', 'sports': ['BADMINTON'], 'skill': 'INTERMEDIATE', 'location': 'Denver, CO'},
    {'name': 'Sophie Chen', 'email': 'sophie.chen@arenax.com', 'sports': ['BADMINTON'], 'skill': 'INTERMEDIATE', 'location': 'Portland, OR'},
    {'name': 'David Kim', 'email': 'david.kim@arenax.com', 'sports': ['FUTSAL', 'BADMINTON'], 'skill': 'INTERMEDIATE', 'location': 'Austin, TX'},
    {'name': 'Priya Patel', 'email': 'priya.patel@arenax.com', 'sports': ['BADMINTON'], 'skill': 'INTERMEDIATE', 'location': 'Atlanta, GA'},
    {'name': 'Kevin Wong', 'email': 'kevin.wong@arenax.com', 'sports': ['FUTSAL'], 'skill': 'INTERMEDIATE', 'location': 'Nashville, TN'},
    
    # Beginner Players
    {'name': 'Anna Lee', 'email': 'anna.lee@arenax.com', 'sports': ['BADMINTON'], 'skill': 'BEGINNER', 'location': 'Philadelphia, PA'},
    {'name': 'Isabella Santos', 'email': 'isabella.santos@arenax.com', 'sports': ['FUTSAL'], 'skill': 'BEGINNER', 'location': 'San Antonio, TX'},
    {'name': 'Diego Fernandez', 'email': 'diego.fernandez@arenax.com', 'sports': ['FUTSAL'], 'skill': 'BEGINNER', 'location': 'Charlotte, NC'},
]

# Add more players for realistic testing
additional_players = [
    'Yuki Tanaka', 'Marcus Williams', 'Olivia Taylor', 'Emma Wilson', 'Noah Anderson',
    'Mia Zhang', 'Ethan Davis', 'Chloe Martin', 'Benjamin Lee', 'Grace Liu',
    'Jackson Smith', 'Luna Rodriguez', 'Caleb Wright', 'Ava Johnson', 'Mason Brown',
    'Sophia Miller', 'Logan Garcia', 'Isabella Martinez', 'Lucas Anderson', 'Amelia Thomas',
    'Alexander Jackson', 'Charlotte White', 'Daniel Harris', 'Emily Clark', 'Matthew Lewis',
    'Abigail Walker', 'Joseph Hall', 'Harper Allen', 'Samuel Young', 'Ella King'
]

for player_data in players_data:
    username = player_data['email'].split('@')[0].replace('.', '_')
    user = CustomUser.objects.create_user(
        username=username,
        email=player_data['email'],
        password='player123',
        full_name=player_data['name'],
        phone_number=f"+1555{random.randint(100000, 999999)}",
        role='PLAYER',
        is_verified=True,
        preferred_sports=player_data['sports'],
        skill_level=player_data['skill'],
        location=player_data['location'],
        is_available_for_matches=True
    )
    users[username] = user
    print(f"✅ Player: {user.full_name} - {player_data['skill']} ({', '.join(player_data['sports'])})")

# Create additional players
for i, name in enumerate(additional_players, start=len(players_data)):
    email = f"{name.lower().replace(' ', '.')}@arenax.com"
    username = email.split('@')[0].replace('.', '_')
    sports = random.choice([['FUTSAL'], ['BADMINTON'], ['FUTSAL', 'BADMINTON']])
    skill = random.choice(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
    
    user = CustomUser.objects.create_user(
        username=username,
        email=email,
        password='player123',
        full_name=name,
        phone_number=f"+1555{random.randint(100000, 999999)}",
        role='PLAYER',
        is_verified=True,
        preferred_sports=sports,
        skill_level=skill,
        location=random.choice(['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX']),
        is_available_for_matches=True
    )
    users[username] = user

print(f"\n✅ Total users created: {CustomUser.objects.count()}")
print(f"   - Players: {CustomUser.objects.filter(role='PLAYER').count()}")
print(f"   - Organizers: {CustomUser.objects.filter(role='ORGANIZER').count()}")
print(f"   - Venue Owners: {CustomUser.objects.filter(role='VENUE_OWNER').count()}")
print(f"   - Referees: {CustomUser.objects.filter(role='REFEREE').count()}")
print(f"   - Admin: {CustomUser.objects.filter(role='ADMIN').count()}")

print("\n" + "=" * 80)
print("✅ STEP 1 COMPLETE: Users Created")
print("=" * 80)
print()

# ============================================================================
# STEP 2: CREATE VENUES
# ============================================================================
print("🏟️  STEP 2: Creating Venues")
print("-" * 80)

venues = {}
venue_owner_david = users['david_venue']
venue_owner_lisa = users['lisa_venue']

venues_data = [
    {
        'owner': venue_owner_david,
        'name': 'Elite Sports Complex - Main Court',
        'location': '123 Sports Ave, San Francisco, CA 94102',
        'sport_type': 'FUTSAL',
        'court_size': 'Professional 40x20m',
        'facilities': 'Professional futsal court, changing rooms, parking, refreshments, LED lighting',
        'capacity': 50,
        'price_per_hour': Decimal('150.00'),
        'operating_days': [1, 2, 3, 4, 5, 6, 7]  # All days
    },
    {
        'owner': venue_owner_david,
        'name': 'Elite Sports Complex - Court 2',
        'location': '123 Sports Ave, San Francisco, CA 94102',
        'sport_type': 'BADMINTON',
        'court_size': 'Standard 13.4x6.1m',
        'facilities': 'Premium badminton court, professional lighting, equipment storage, air conditioning',
        'capacity': 25,
        'price_per_hour': Decimal('90.00'),
        'operating_days': [1, 2, 3, 4, 5, 6, 7]
    },
    {
        'owner': venue_owner_lisa,
        'name': 'Metro Sports Center - Court 1',
        'location': '456 Metro Blvd, Boston, MA 02108',
        'sport_type': 'BADMINTON',
        'court_size': 'Standard 13.4x6.1m',
        'facilities': 'Indoor badminton court, equipment rental, air conditioning, spectator seating',
        'capacity': 30,
        'price_per_hour': Decimal('80.00'),
        'operating_days': [1, 2, 3, 4, 5, 6]  # Mon-Sat
    },
    {
        'owner': venue_owner_lisa,
        'name': 'Metro Sports Center - Court 2',
        'location': '456 Metro Blvd, Boston, MA 02108',
        'sport_type': 'FUTSAL',
        'court_size': 'Standard 38x18m',
        'facilities': 'Indoor futsal court, sound system, LED lighting, locker rooms',
        'capacity': 40,
        'price_per_hour': Decimal('120.00'),
        'operating_days': [1, 2, 3, 4, 5, 6, 7]
    }
]

for venue_data in venues_data:
    venue = Venue.objects.create(**venue_data)
    venues[venue.name] = venue
    print(f"✅ Venue: {venue.name} ({venue.sport_type}) - NPR {venue.price_per_hour}/hr")
    
    # Create availability for next 60 days
    today = timezone.now().date()
    for day_offset in range(60):
        date = today + timedelta(days=day_offset)
        if date.weekday() + 1 in venue.operating_days:
            VenueAvailability.objects.create(
                venue=venue,
                date=date,
                opening_time=time(8, 0),
                closing_time=time(22, 0),
                is_available=True
            )

print(f"\n✅ Total venues created: {Venue.objects.count()}")
print(f"✅ Venue availability slots created: {VenueAvailability.objects.count()}")

print("\n" + "=" * 80)
print("✅ STEP 2 COMPLETE: Venues Created")
print("=" * 80)
print()

# ============================================================================
# STEP 3: CREATE TEAMS
# ============================================================================
print("👥 STEP 3: Creating Teams")
print("-" * 80)

teams = {}
all_players = list(CustomUser.objects.filter(role='PLAYER'))

teams_data = [
    # Futsal Teams
    {'name': 'Thunder Strikers', 'sport': ['FUTSAL'], 'owner': 'carlos_silva', 'size': 12},
    {'name': 'Elite Eagles', 'sport': ['FUTSAL'], 'owner': 'roberto_martinez', 'size': 10},
    {'name': 'Futsal Masters', 'sport': ['FUTSAL'], 'owner': 'michael_johnson', 'size': 14},
    {'name': 'Dream Team FC', 'sport': ['FUTSAL'], 'owner': 'ahmed_hassan', 'size': 12},
    {'name': 'Rookie Rockets', 'sport': ['FUTSAL'], 'owner': 'isabella_santos', 'size': 7},
    {'name': 'Rising Titans', 'sport': ['FUTSAL'], 'owner': 'kevin_wong', 'size': 9},
    
    # Badminton Teams
    {'name': 'Lightning Bolts', 'sport': ['BADMINTON'], 'owner': 'maria_garcia', 'size': 8},
    {'name': 'Badminton Aces', 'sport': ['BADMINTON'], 'owner': 'sophie_chen', 'size': 6},
    {'name': 'Smash Champions', 'sport': ['BADMINTON'], 'owner': 'elena_rodriguez', 'size': 9},
    {'name': 'Victory Vipers', 'sport': ['BADMINTON'], 'owner': 'lucas_thompson', 'size': 11},
    {'name': 'Shuttle Stars', 'sport': ['BADMINTON'], 'owner': 'priya_patel', 'size': 8},
    
    # Multi-Sport Teams
    {'name': 'Phoenix Warriors', 'sport': ['FUTSAL', 'BADMINTON'], 'owner': 'james_brown', 'size': 15},
    {'name': 'All-Star United', 'sport': ['FUTSAL', 'BADMINTON'], 'owner': 'david_kim', 'size': 13},
    {'name': 'Golden Gladiators', 'sport': ['FUTSAL', 'BADMINTON'], 'owner': 'fatima_alzahra', 'size': 15},
]

for team_data in teams_data:
    owner = users[team_data['owner']]
    team = Team.objects.create(
        name=team_data['name'],
        sport_types=team_data['sport'],
        owner=owner,
        max_size=15
    )
    teams[team.name] = team
    
    # Add owner as member
    TeamMembership.objects.create(
        team=team,
        player=owner,
        role='OWNER',
        is_active=True
    )
    
    # Add activity history
    ActivityHistory.objects.create(
        team=team,
        event_type='TEAM_CREATED',
        description=f'Team {team.name} was created',
        performed_by=owner
    )
    
    # Add random players as members
    available_players = [p for p in all_players if p != owner and any(sport in p.preferred_sports for sport in team_data['sport'])]
    num_members = min(team_data['size'] - 1, len(available_players))
    selected_players = random.sample(available_players, num_members)
    
    for i, player in enumerate(selected_players):
        role = 'LEADER' if i < 2 else 'MEMBER'
        TeamMembership.objects.create(
            team=team,
            player=player,
            role=role,
            is_active=True
        )
        ActivityHistory.objects.create(
            team=team,
            event_type='MEMBER_ADDED',
            description=f'{player.full_name} joined the team',
            performed_by=owner
        )
    
    print(f"✅ Team: {team.name} ({', '.join(team.sport_types)}) - {team.member_count} members")

print(f"\n✅ Total teams created: {Team.objects.count()}")
print(f"✅ Total team memberships: {TeamMembership.objects.count()}")

print("\n" + "=" * 80)
print("✅ STEP 3 COMPLETE: Teams Created")
print("=" * 80)
print()

# ============================================================================
# STEP 4: CREATE TOURNAMENTS
# ============================================================================
print("🏆 STEP 4: Creating Tournaments")
print("-" * 80)

tournaments = {}
organizer_alex = users['alex_organizer']
organizer_emma = users['emma_organizer']
today = timezone.now().date()

# Individual Registration Tournaments (Badminton only - Futsal is team-based)
individual_tournaments_data = [
    {
        'title': 'Badminton Masters Tournament',
        'organizer': organizer_emma,
        'sport_type': 'BADMINTON',
        'tournament_type': 'knockout',
        'registration_type': 'INDIVIDUAL',
        'date': today + timedelta(days=22),
        'venue': venues['Metro Sports Center - Court 1'],
        'entry_fee': Decimal('35.00'),
        'max_participants': 32,
        'prize_pool': Decimal('1500.00')
    },
    {
        'title': 'Badminton Beginners Cup',
        'organizer': organizer_emma,
        'sport_type': 'BADMINTON',
        'tournament_type': 'knockout',
        'registration_type': 'INDIVIDUAL',
        'date': today + timedelta(days=30),
        'venue': venues['Elite Sports Complex - Court 2'],
        'entry_fee': Decimal('20.00'),
        'max_participants': 24,
        'prize_pool': Decimal('600.00')
    },
    {
        'title': 'Summer Badminton Singles Championship',
        'organizer': organizer_emma,
        'sport_type': 'BADMINTON',
        'tournament_type': 'knockout',
        'registration_type': 'INDIVIDUAL',
        'date': today + timedelta(days=40),
        'venue': venues['Elite Sports Complex - Court 2'],
        'entry_fee': Decimal('30.00'),
        'max_participants': 16,
        'prize_pool': Decimal('800.00')
    }
]

for tourn_data in individual_tournaments_data:
    venue = tourn_data.pop('venue')
    tournament = Tournament.objects.create(
        **tourn_data,
        team_size=1,
        allow_substitutes=False,
        max_substitutes=0,
        start_time=time(14, 0) if 'Weekend' in tourn_data['title'] else time(10, 0),
        end_time=time(20, 0) if 'Weekend' in tourn_data['title'] else time(18, 0),
        venue=venue.name,
        venue_address=venue.location,
        linked_venue=venue,
        registration_deadline=timezone.now() + timedelta(days=(tourn_data['date'] - today).days - 2),
        status='UPCOMING',
        min_participants=4
    )
    tournaments[tournament.title] = tournament
    print(f"✅ Tournament: {tournament.title} ({tournament.sport_type}) - {tournament.tournament_type}")

# Team Registration Tournaments (All Futsal + Badminton Doubles)
team_tournaments_data = [
    {
        'title': 'Weekend Futsal League',
        'organizer': organizer_alex,
        'sport_type': 'FUTSAL',
        'tournament_type': 'league',
        'registration_type': 'TEAM',
        'date': today + timedelta(days=8),
        'venue': venues['Metro Sports Center - Court 2'],
        'entry_fee': Decimal('150.00'),
        'max_participants': 8,
        'team_size': 5,
        'allow_substitutes': True,
        'max_substitutes': 8,
        'prize_pool': Decimal('1500.00')
    },
    {
        'title': 'Spring Futsal Championship 2024',
        'organizer': organizer_alex,
        'sport_type': 'FUTSAL',
        'tournament_type': 'knockout',
        'registration_type': 'TEAM',
        'date': today + timedelta(days=15),
        'venue': venues['Elite Sports Complex - Main Court'],
        'entry_fee': Decimal('200.00'),
        'max_participants': 8,
        'team_size': 5,
        'allow_substitutes': True,
        'max_substitutes': 10,
        'prize_pool': Decimal('3000.00')
    },
    {
        'title': 'Corporate Futsal League',
        'organizer': organizer_alex,
        'sport_type': 'FUTSAL',
        'tournament_type': 'league',
        'registration_type': 'TEAM',
        'date': today + timedelta(days=12),
        'venue': venues['Elite Sports Complex - Main Court'],
        'entry_fee': Decimal('150.00'),
        'max_participants': 10,
        'team_size': 5,
        'allow_substitutes': True,
        'max_substitutes': 8,
        'prize_pool': Decimal('2000.00')
    },
    {
        'title': 'Badminton Doubles Team Tournament',
        'organizer': organizer_emma,
        'sport_type': 'BADMINTON',
        'tournament_type': 'knockout',
        'registration_type': 'TEAM',
        'date': today + timedelta(days=18),
        'venue': venues['Metro Sports Center - Court 1'],
        'entry_fee': Decimal('80.00'),
        'max_participants': 12,
        'team_size': 2,
        'allow_substitutes': False,
        'max_substitutes': 0,
        'prize_pool': Decimal('1000.00')
    },
    {
        'title': 'Elite Futsal Team Championship',
        'organizer': organizer_alex,
        'sport_type': 'FUTSAL',
        'tournament_type': 'knockout',
        'registration_type': 'TEAM',
        'date': today + timedelta(days=25),
        'venue': venues['Elite Sports Complex - Main Court'],
        'entry_fee': Decimal('200.00'),
        'max_participants': 8,
        'team_size': 5,
        'allow_substitutes': True,
        'max_substitutes': 10,
        'prize_pool': Decimal('3000.00')
    }
]

for tourn_data in team_tournaments_data:
    venue = tourn_data.pop('venue')
    tournament = Tournament.objects.create(
        **tourn_data,
        start_time=time(18, 0) if 'Corporate' in tourn_data['title'] else time(10, 0),
        end_time=time(22, 0) if 'Corporate' in tourn_data['title'] else time(18, 0),
        venue=venue.name,
        venue_address=venue.location,
        linked_venue=venue,
        registration_deadline=timezone.now() + timedelta(days=(tourn_data['date'] - today).days - 2),
        status='UPCOMING',
        min_participants=4
    )
    tournaments[tournament.title] = tournament
    print(f"✅ Team Tournament: {tournament.title} - {tournament.team_size} players + {tournament.max_substitutes} subs")

print(f"\n✅ Total tournaments created: {Tournament.objects.count()}")

print("\n" + "=" * 80)
print("✅ STEP 4 COMPLETE: Tournaments Created")
print("=" * 80)
print()

# ============================================================================
# STEP 5: CREATE TOURNAMENT REGISTRATIONS
# ============================================================================
print("📝 STEP 5: Creating Tournament Registrations")
print("-" * 80)

# Register players for individual tournaments
for tournament in Tournament.objects.filter(registration_type='INDIVIDUAL'):
    eligible_players = [p for p in all_players if tournament.sport_type in p.preferred_sports]
    num_registrations = min(random.randint(4, tournament.max_participants - 2), len(eligible_players))
    selected_players = random.sample(eligible_players, num_registrations)
    
    for player in selected_players:
        status = random.choice(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'PENDING'])  # 75% accepted
        TournamentRegistration.objects.create(
            tournament=tournament,
            player=player,
            status=status
        )
    
    print(f"✅ {tournament.title}: {num_registrations} registrations")

# Register teams for team tournaments
for tournament in Tournament.objects.filter(registration_type='TEAM'):
    eligible_teams = [t for t in teams.values() if tournament.sport_type in t.sport_types and t.member_count >= tournament.team_size]
    num_registrations = min(random.randint(3, tournament.max_participants - 1), len(eligible_teams))
    selected_teams = random.sample(eligible_teams, num_registrations)
    
    # Track players already selected for this tournament to prevent duplicates
    players_already_selected = set()
    
    for team in selected_teams:
        # Select players from team for tournament, excluding those already selected by other teams
        team_members = list(team.memberships.filter(is_active=True))
        available_members = [m for m in team_members if m.player.id not in players_already_selected]
        
        # If not enough unique players, skip this team or use what's available
        if len(available_members) < tournament.team_size:
            print(f"⚠️  Skipping {team.name} for {tournament.title} - not enough unique players available")
            continue
        
        max_players = tournament.team_size + tournament.max_substitutes
        num_players = min(random.randint(tournament.team_size, max_players), len(available_members))
        selected_members = random.sample(available_members, num_players)
        
        registration = TeamTournamentRegistration.objects.create(
            tournament=tournament,
            team=team,
            registered_by=team.owner,
            status='CONFIRMED'
        )
        registration.selected_players.set([m.player for m in selected_members])
        
        # Mark these players as selected for this tournament
        for member in selected_members:
            players_already_selected.add(member.player.id)
        
        # Add activity history
        ActivityHistory.objects.create(
            team=team,
            event_type='TOURNAMENT_REGISTERED',
            description=f'Team registered for {tournament.title}',
            performed_by=team.owner
        )
    
    print(f"✅ {tournament.title}: {num_registrations} team registrations")

print(f"\n✅ Total individual registrations: {TournamentRegistration.objects.count()}")
print(f"✅ Total team registrations: {TeamTournamentRegistration.objects.count()}")

print("\n" + "=" * 80)
print("✅ STEP 5 COMPLETE: Tournament Registrations Created")
print("=" * 80)
print()

# ============================================================================
# STEP 6: CREATE VENUE BOOKINGS
# ============================================================================
print("📅 STEP 6: Creating Venue Bookings")
print("-" * 80)

booking_count = 0
for venue in venues.values():
    # Create some bookings for next 30 days
    for day_offset in range(0, 30, random.randint(2, 5)):
        date = today + timedelta(days=day_offset)
        if date.weekday() + 1 in venue.operating_days:
            # Random booking time
            start_hour = random.randint(8, 18)
            duration = random.choice([1, 2, 3])
            
            booker = random.choice(all_players)
            status = random.choice(['CONFIRMED', 'CONFIRMED', 'PENDING'])
            payment_status = 'COMPLETED' if status == 'CONFIRMED' else 'PENDING'
            
            try:
                booking = VenueBooking.objects.create(
                    venue=venue,
                    user=booker,
                    date=date,
                    start_time=time(start_hour, 0),
                    end_time=time(start_hour + duration, 0),
                    purpose=random.choice(['Practice', 'Training', 'Friendly Match', 'Team Practice']),
                    status=status,
                    payment_status=payment_status
                )
                booking_count += 1
            except:
                pass  # Skip if time slot conflicts

print(f"✅ Total venue bookings created: {booking_count}")

print("\n" + "=" * 80)
print("✅ STEP 6 COMPLETE: Venue Bookings Created")
print("=" * 80)
print()

# ============================================================================
# STEP 7: CREATE REFEREE AVAILABILITY & BOOKINGS
# ============================================================================
print("🎽 STEP 7: Creating Referee Availability & Bookings")
print("-" * 80)

referees = CustomUser.objects.filter(role='REFEREE')

# Create referee availability for next 45 days
for referee in referees:
    for day_offset in range(0, 45, random.randint(1, 3)):
        date = today + timedelta(days=day_offset)
        # Referees available on weekdays and some weekends
        if date.weekday() < 5 or random.random() < 0.5:
            RefereeAvailability.objects.create(
                referee=referee,
                available_date=date,
                start_time=time(9, 0),
                end_time=time(21, 0),
                is_available=True
            )

print(f"✅ Referee availability slots created: {RefereeAvailability.objects.count()}")

# Note: Not creating referee bookings in seed data to avoid pre-generating matches
# Organizers should generate brackets/schedules and then book referees
referee_booking_count = 0

print(f"✅ Referee bookings created: {referee_booking_count}")
print(f"   Note: Matches should be generated by organizers using 'Generate Bracket' or 'Generate Schedule' buttons")

print("\n" + "=" * 80)
print("✅ STEP 7 COMPLETE: Referee System Created")
print("=" * 80)
print()

# ============================================================================
# STEP 8: CREATE NOTIFICATIONS
# ============================================================================
print("🔔 STEP 8: Creating Notifications")
print("-" * 80)

notification_count = 0

# Create notifications for tournament registrations
for registration in TournamentRegistration.objects.all()[:20]:
    if registration.status == 'ACCEPTED':
        Notification.objects.create(
            user=registration.player,
            notification_type='REGISTRATION_CONFIRMED',
            title='Tournament Registration Confirmed',
            message=f'Your registration for {registration.tournament.title} has been confirmed!',
            tournament=registration.tournament
        )
        notification_count += 1

# Create notifications for venue bookings
for booking in VenueBooking.objects.filter(status='CONFIRMED')[:15]:
    Notification.objects.create(
        user=booking.user,
        notification_type='BOOKING_CONFIRMED',
        title='Venue Booking Confirmed',
        message=f'Your booking at {booking.venue.name} on {booking.date} has been confirmed.'
    )
    notification_count += 1

# Create notifications for team invitations
for team in teams.values():
    members = team.memberships.filter(is_active=True).exclude(role='OWNER')[:3]
    for membership in members:
        Notification.objects.create(
            user=membership.player,
            notification_type='GENERAL',
            title='Welcome to the Team',
            message=f'You have been added to {team.name}. Welcome aboard!'
        )
        notification_count += 1

print(f"✅ Total notifications created: {notification_count}")

print("\n" + "=" * 80)
print("✅ STEP 8 COMPLETE: Notifications Created")
print("=" * 80)
print()

# ============================================================================
# STEP 9: CREATE CHAT MESSAGES
# ============================================================================
print("💬 STEP 9: Creating Chat Messages")
print("-" * 80)

message_count = 0

# Create some messages between players
sample_players = random.sample(all_players, min(20, len(all_players)))
for i in range(0, len(sample_players) - 1, 2):
    player1 = sample_players[i]
    player2 = sample_players[i + 1]
    
    # Create messages between the two players
    messages_data = [
        (player1, player2, "Hey! Want to practice this weekend?"),
        (player2, player1, "Sure! What time works for you?"),
        (player1, player2, "How about Saturday at 2 PM?"),
        (player2, player1, "Perfect! See you then."),
    ]
    
    for sender, receiver, content in messages_data:
        ChatMessage.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
            read=random.choice([True, False])
        )
        message_count += 1

print(f"✅ Messages created: {message_count}")

print("\n" + "=" * 80)
print("✅ STEP 9 COMPLETE: Chat System Created")
print("=" * 80)
print()

# ============================================================================
# STEP 10: CREATE PLAYER STATISTICS
# ============================================================================
print("📊 STEP 10: Creating Player Statistics")
print("-" * 80)

stats_count = 0
current_date = timezone.now()

# Create monthly statistics for some players
for player in random.sample(all_players, min(30, len(all_players))):
    # Create stats for last 3 months
    for month_offset in range(3):
        target_date = current_date - timedelta(days=30 * month_offset)
        
        PlayerStatistics.objects.create(
            player=player,
            year=target_date.year,
            month=target_date.month,
            matches_played=random.randint(3, 15),
            matches_won=random.randint(1, 10),
            tournaments_participated=random.randint(1, 5),
            tournaments_won=random.randint(0, 2)
        )
        stats_count += 1

print(f"✅ Player statistics created: {stats_count}")

print("\n" + "=" * 80)
print("✅ STEP 10 COMPLETE: Player Statistics Created")
print("=" * 80)
print()

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("🎉 SEED DATA GENERATION COMPLETE!")
print("=" * 80)
print()
print("📊 FINAL SUMMARY:")
print("-" * 80)
print(f"👥 Users: {CustomUser.objects.count()}")
print(f"   - Players: {CustomUser.objects.filter(role='PLAYER').count()}")
print(f"   - Organizers: {CustomUser.objects.filter(role='ORGANIZER').count()}")
print(f"   - Venue Owners: {CustomUser.objects.filter(role='VENUE_OWNER').count()}")
print(f"   - Referees: {CustomUser.objects.filter(role='REFEREE').count()}")
print(f"   - Admin: {CustomUser.objects.filter(role='ADMIN').count()}")
print()
print(f"🏟️  Venues: {Venue.objects.count()}")
print(f"📅 Venue Availability Slots: {VenueAvailability.objects.count()}")
print(f"📝 Venue Bookings: {VenueBooking.objects.count()}")
print()
print(f"👥 Teams: {Team.objects.count()}")
print(f"🤝 Team Memberships: {TeamMembership.objects.count()}")
print(f"📜 Team Activity History: {ActivityHistory.objects.count()}")
print()
print(f"🏆 Tournaments: {Tournament.objects.count()}")
print(f"   - Individual: {Tournament.objects.filter(registration_type='INDIVIDUAL').count()}")
print(f"   - Team: {Tournament.objects.filter(registration_type='TEAM').count()}")
print(f"📝 Individual Registrations: {TournamentRegistration.objects.count()}")
print(f"🏅 Team Registrations: {TeamTournamentRegistration.objects.count()}")
print()
print(f"🎽 Referee Profiles: {RefereeProfile.objects.count()}")
print(f"📅 Referee Availability: {RefereeAvailability.objects.count()}")
print(f"📋 Referee Bookings: {RefereeBooking.objects.count()}")
print()
print(f"🔔 Notifications: {Notification.objects.count()}")
print(f"📨 Messages: {ChatMessage.objects.count()}")
print(f"📊 Player Statistics: {PlayerStatistics.objects.count()}")
print()
print("=" * 80)
print("✅ All seed data has been created successfully!")
print("=" * 80)
print()
print("🔐 TEST CREDENTIALS:")
print("-" * 80)
print("Admin:         admin@arenax.com / admin123")
print("Organizer:     alex.organizer@arenax.com / organizer123")
print("Venue Owner:   david.venue@arenax.com / venue123")
print("Referee:       john.referee@arenax.com / referee123")
print("Player:        carlos.silva@arenax.com / player123")
print("=" * 80)
print()
