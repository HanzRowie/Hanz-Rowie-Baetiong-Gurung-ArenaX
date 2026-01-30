#!/usr/bin/env python3
"""
Django management command to create comprehensive seed data for UI testing
with specific users: alex.organizer@arenax.com and carlos.silva@arenax.com
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import random

from accounts.models import CustomUser, PlayerStatistics
from tournaments.models import Tournament, TournamentRegistration, Match
from teams.models import Team, TeamMembership, TeamTournamentRegistration
from venues.models import Venue, VenueAvailability, VenueBooking


class Command(BaseCommand):
    help = 'Create comprehensive seed data for UI testing with specific users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Clean existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clean']:
            self.clean_existing_data()
        
        self.stdout.write(self.style.SUCCESS('Creating UI test seed data...'))
        
        # Create users
        organizer, players, referees, venue_owners = self.create_users()
        
        # Create venues
        venues = self.create_venues(venue_owners)
        
        # Create teams
        teams = self.create_teams(players)
        
        # Create tournaments
        tournaments = self.create_tournaments(organizer, venues)
        
        # Register players and teams for tournaments
        self.register_participants(tournaments, players, teams)
        
        # Create some completed tournaments with results
        self.create_completed_tournaments(organizer, players, venues)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created seed data:\n'
                f'- 1 Organizer (alex.organizer@arenax.com)\n'
                f'- 20 Players (including carlos.silva@arenax.com)\n'
                f'- 5 Referees\n'
                f'- 3 Venue Owners\n'
                f'- 5 Venues\n'
                f'- 8 Teams\n'
                f'- 6 Active Tournaments\n'
                f'- 3 Completed Tournaments with Results'
            )
        )

    def clean_existing_data(self):
        """Clean existing data"""
        self.stdout.write('Cleaning existing data...')
        
        # Delete in order to respect foreign key constraints
        Match.objects.all().delete()
        TournamentRegistration.objects.all().delete()
        TeamTournamentRegistration.objects.all().delete()
        Tournament.objects.all().delete()
        TeamMembership.objects.all().delete()
        Team.objects.all().delete()
        VenueBooking.objects.all().delete()
        VenueAvailability.objects.all().delete()
        Venue.objects.all().delete()
        PlayerStatistics.objects.all().delete()
        
        # Delete test users but keep the specific ones if they exist
        CustomUser.objects.exclude(
            email__in=['alex.organizer@arenax.com', 'carlos.silva@arenax.com']
        ).filter(
            email__contains='@arenax.com'
        ).delete()
        
        self.stdout.write(self.style.SUCCESS('Existing data cleaned.'))

    def create_users(self):
        """Create users including the specific ones requested"""
        self.stdout.write('Creating users...')
        
        # Create the specific organizer
        organizer, created = CustomUser.objects.get_or_create(
            email='alex.organizer@arenax.com',
            defaults={
                'username': 'alex_organizer',
                'full_name': 'Alex Rodriguez',
                'role': 'ORGANIZER',
                'is_active': True,
                'is_verified': True,
                'phone_number': '+1-555-0101',
                'bio': 'Professional tournament organizer with 10+ years experience',
                'location': 'Los Angeles, CA',
                'country': 'USA',
                'gender': 'MALE',
                'skill_level': 'PROFESSIONAL'
            }
        )
        if created:
            organizer.set_password('arenax2024')
            organizer.save()
            self.stdout.write(f'Created organizer: {organizer.email}')
        
        # Create the specific player
        carlos, created = CustomUser.objects.get_or_create(
            email='carlos.silva@arenax.com',
            defaults={
                'username': 'carlos_silva',
                'full_name': 'Carlos Silva',
                'role': 'PLAYER',
                'is_active': True,
                'is_verified': True,
                'phone_number': '+1-555-0102',
                'bio': 'Passionate futsal player and team captain',
                'location': 'Miami, FL',
                'country': 'USA',
                'gender': 'MALE',
                'skill_level': 'ADVANCED',
                'preferred_sports': ['FUTSAL', 'BADMINTON'],
                'matches_played': 45,
                'matches_won': 32,
                'win_rate': 71.1
            }
        )
        if created:
            carlos.set_password('arenax2024')
            carlos.save()
            self.stdout.write(f'Created player: {carlos.email}')
        
        # Create additional realistic players
        player_data = [
            ('maria.gonzalez@arenax.com', 'Maria Gonzalez', 'FEMALE', 'ADVANCED', ['BADMINTON']),
            ('david.chen@arenax.com', 'David Chen', 'MALE', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON']),
            ('sarah.johnson@arenax.com', 'Sarah Johnson', 'FEMALE', 'PROFESSIONAL', ['BADMINTON']),
            ('miguel.torres@arenax.com', 'Miguel Torres', 'MALE', 'ADVANCED', ['FUTSAL']),
            ('emma.wilson@arenax.com', 'Emma Wilson', 'FEMALE', 'INTERMEDIATE', ['BADMINTON']),
            ('luis.martinez@arenax.com', 'Luis Martinez', 'MALE', 'PROFESSIONAL', ['FUTSAL']),
            ('anna.kowalski@arenax.com', 'Anna Kowalski', 'FEMALE', 'ADVANCED', ['BADMINTON']),
            ('james.brown@arenax.com', 'James Brown', 'MALE', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON']),
            ('sofia.rodriguez@arenax.com', 'Sofia Rodriguez', 'FEMALE', 'ADVANCED', ['FUTSAL']),
            ('ryan.murphy@arenax.com', 'Ryan Murphy', 'MALE', 'INTERMEDIATE', ['BADMINTON']),
            ('isabella.garcia@arenax.com', 'Isabella Garcia', 'FEMALE', 'PROFESSIONAL', ['FUTSAL']),
            ('alex.kim@arenax.com', 'Alex Kim', 'MALE', 'ADVANCED', ['BADMINTON']),
            ('natasha.petrov@arenax.com', 'Natasha Petrov', 'FEMALE', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON']),
            ('diego.fernandez@arenax.com', 'Diego Fernandez', 'MALE', 'ADVANCED', ['FUTSAL']),
            ('chloe.martin@arenax.com', 'Chloe Martin', 'FEMALE', 'INTERMEDIATE', ['BADMINTON']),
            ('omar.hassan@arenax.com', 'Omar Hassan', 'MALE', 'PROFESSIONAL', ['FUTSAL']),
            ('zara.ahmed@arenax.com', 'Zara Ahmed', 'FEMALE', 'ADVANCED', ['BADMINTON']),
            ('luca.rossi@arenax.com', 'Luca Rossi', 'MALE', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON']),
            ('priya.patel@arenax.com', 'Priya Patel', 'FEMALE', 'ADVANCED', ['BADMINTON']),
        ]
        
        players = [carlos]  # Start with Carlos
        
        for i, (email, name, gender, skill, sports) in enumerate(player_data):
            player, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0].replace('.', '_'),
                    'full_name': name,
                    'role': 'PLAYER',
                    'is_active': True,
                    'is_verified': True,
                    'phone_number': f'+1-555-{1200 + i:04d}',
                    'bio': f'Competitive {" and ".join(sports).lower()} player',
                    'location': random.choice(['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL', 'Houston, TX']),
                    'country': 'USA',
                    'gender': gender,
                    'skill_level': skill,
                    'preferred_sports': sports,
                    'matches_played': random.randint(10, 80),
                    'matches_won': 0,  # Will be calculated
                }
            )
            if created:
                player.set_password('arenax2024')
                # Calculate realistic win rate based on skill level
                skill_multipliers = {'BEGINNER': 0.3, 'INTERMEDIATE': 0.5, 'ADVANCED': 0.65, 'PROFESSIONAL': 0.8}
                base_rate = skill_multipliers.get(skill, 0.5)
                win_rate = base_rate + random.uniform(-0.15, 0.15)
                win_rate = max(0.1, min(0.95, win_rate))  # Keep between 10% and 95%
                
                player.matches_won = int(player.matches_played * win_rate)
                player.win_rate = win_rate * 100
                player.save()
            
            players.append(player)
        
        # Create referees
        referee_data = [
            ('john.referee@arenax.com', 'John Smith', 'Certified referee with 8 years experience'),
            ('lisa.referee@arenax.com', 'Lisa Wang', 'Professional badminton referee'),
            ('carlos.referee@arenax.com', 'Carlos Mendez', 'FIFA certified futsal referee'),
            ('sarah.referee@arenax.com', 'Sarah Davis', 'International tournament referee'),
            ('mike.referee@arenax.com', 'Mike Johnson', 'Local sports referee and coach'),
        ]
        
        referees = []
        for email, name, bio in referee_data:
            referee, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0].replace('.', '_'),
                    'full_name': name,
                    'role': 'REFEREE',
                    'is_active': True,
                    'is_verified': True,
                    'phone_number': f'+1-555-{2000 + len(referees):04d}',
                    'bio': bio,
                    'location': 'Los Angeles, CA',
                    'country': 'USA',
                }
            )
            if created:
                referee.set_password('arenax2024')
                referee.save()
            
            referees.append(referee)
        
        # Create venue owners
        venue_owner_data = [
            ('sports.center@arenax.com', 'Sports Center Manager', 'Professional sports facility management'),
            ('elite.venues@arenax.com', 'Elite Venues LLC', 'Premium sports venue operator'),
            ('community.sports@arenax.com', 'Community Sports Hub', 'Local community sports facility'),
        ]
        
        venue_owners = []
        for email, name, bio in venue_owner_data:
            owner, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0].replace('.', '_'),
                    'full_name': name,
                    'role': 'VENUE_OWNER',
                    'is_active': True,
                    'is_verified': True,
                    'phone_number': f'+1-555-{3000 + len(venue_owners):04d}',
                    'bio': bio,
                    'business_name': name,
                    'business_registration': f'REG-{1000 + len(venue_owners)}',
                    'business_contact': f'+1-555-{3000 + len(venue_owners):04d}',
                    'location': 'Los Angeles, CA',
                    'country': 'USA',
                }
            )
            if created:
                owner.set_password('arenax2024')
                owner.save()
            
            venue_owners.append(owner)
        
        return organizer, players, referees, venue_owners

    def create_venues(self, venue_owners):
        """Create realistic venues"""
        self.stdout.write('Creating venues...')
        
        venue_data = [
            {
                'name': 'ArenaX Sports Complex',
                'location': '1234 Sports Boulevard, Los Angeles, CA 90210',
                'sport_type': 'FUTSAL',
                'capacity': 100,
                'price_per_hour': Decimal('75.00'),
                'facilities': 'Professional futsal court, changing rooms, parking, cafeteria',
                'court_size': 'FIFA Standard',
            },
            {
                'name': 'Elite Badminton Center',
                'location': '5678 Racquet Drive, Beverly Hills, CA 90211',
                'sport_type': 'BADMINTON',
                'capacity': 50,
                'price_per_hour': Decimal('60.00'),
                'facilities': '4 professional badminton courts, equipment rental, pro shop',
                'court_size': 'BWF Standard',
            },
            {
                'name': 'Community Sports Hub',
                'location': '9012 Community Lane, Santa Monica, CA 90401',
                'sport_type': 'FUTSAL',
                'capacity': 80,
                'price_per_hour': Decimal('50.00'),
                'facilities': 'Multi-purpose court, basic amenities, free parking',
                'court_size': 'Standard',
            },
            {
                'name': 'Premier Badminton Academy',
                'location': '3456 Championship Court, Pasadena, CA 91101',
                'sport_type': 'BADMINTON',
                'capacity': 60,
                'price_per_hour': Decimal('65.00'),
                'facilities': '6 courts, coaching available, tournament hosting',
                'court_size': 'Professional',
            },
            {
                'name': 'Metro Futsal Arena',
                'location': '7890 Metro Plaza, Long Beach, CA 90802',
                'sport_type': 'FUTSAL',
                'capacity': 120,
                'price_per_hour': Decimal('80.00'),
                'facilities': 'Indoor arena, spectator seating, live streaming setup',
                'court_size': 'Professional',
            },
        ]
        
        venues = []
        for i, data in enumerate(venue_data):
            venue = Venue.objects.create(
                owner=venue_owners[i % len(venue_owners)],
                operating_days=[1, 2, 3, 4, 5, 6, 7],  # All days
                **data
            )
            
            # Create availability for the next 30 days
            for day_offset in range(30):
                availability_date = date.today() + timedelta(days=day_offset)
                VenueAvailability.objects.create(
                    venue=venue,
                    date=availability_date,
                    opening_time=time(8, 0),
                    closing_time=time(22, 0),
                    is_available=True
                )
            
            venues.append(venue)
        
        return venues

    def create_teams(self, players):
        """Create realistic teams"""
        self.stdout.write('Creating teams...')
        
        team_data = [
            {
                'name': 'Los Angeles Lightning',
                'sport_types': ['FUTSAL'],
                'owner': players[0],  # Carlos Silva
                'members': players[1:6],  # 5 additional members
            },
            {
                'name': 'Beverly Hills Badminton Club',
                'sport_types': ['BADMINTON'],
                'owner': players[2],  # Maria Gonzalez
                'members': [players[3]],  # 1 additional member for doubles
            },
            {
                'name': 'Santa Monica Strikers',
                'sport_types': ['FUTSAL'],
                'owner': players[5],  # Miguel Torres
                'members': players[6:11],  # 5 additional members
            },
            {
                'name': 'Elite Shuttlers',
                'sport_types': ['BADMINTON'],
                'owner': players[7],  # Emma Wilson
                'members': [players[8]],  # 1 additional member for doubles
            },
            {
                'name': 'Metro Futsal Masters',
                'sport_types': ['FUTSAL'],
                'owner': players[10],  # Luis Martinez
                'members': players[11:16],  # 5 additional members
            },
            {
                'name': 'Championship Racquets',
                'sport_types': ['BADMINTON'],
                'owner': players[16],  # Anna Kowalski
                'members': [players[17]],  # 1 additional member for doubles
            },
            {
                'name': 'Golden State Futsal',
                'sport_types': ['FUTSAL'],
                'owner': players[18],  # James Brown
                'members': players[1:6],  # Reuse some players (players can be in multiple teams)
            },
            {
                'name': 'Pacific Badminton Alliance',
                'sport_types': ['BADMINTON'],
                'owner': players[19],  # Sofia Rodriguez
                'members': [players[4]],  # 1 additional member for doubles
            },
        ]
        
        teams = []
        for data in team_data:
            team = Team.objects.create(
                name=data['name'],
                sport_types=data['sport_types'],
                owner=data['owner']
            )
            
            # Add owner as team member
            TeamMembership.objects.create(
                team=team,
                player=data['owner'],
                role='OWNER',
                is_active=True
            )
            
            # Add other members
            for member in data['members']:
                TeamMembership.objects.create(
                    team=team,
                    player=member,
                    role='MEMBER',
                    is_active=True
                )
            
            teams.append(team)
        
        return teams

    def create_tournaments(self, organizer, venues):
        """Create upcoming tournaments"""
        self.stdout.write('Creating tournaments...')
        
        tournament_data = [
            {
                'title': 'ArenaX Spring Badminton Championship',
                'description': 'Premier badminton singles tournament featuring top players from across California',
                'sport_type': 'BADMINTON',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() + timedelta(days=14),
                'start_time': time(9, 0),
                'end_time': time(18, 0),
                'venue_idx': 1,  # Elite Badminton Center
                'entry_fee': Decimal('50.00'),
                'max_participants': 16,
                'min_participants': 8,
                'prize_pool': Decimal('2000.00'),
                'rules': 'BWF rules apply. Best of 3 games to 21 points.',
            },
            {
                'title': 'Los Angeles Futsal League - Season Opener',
                'description': 'Individual futsal skills competition to kick off the new season',
                'sport_type': 'FUTSAL',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() + timedelta(days=21),
                'start_time': time(10, 0),
                'end_time': time(17, 0),
                'venue_idx': 0,  # ArenaX Sports Complex
                'entry_fee': Decimal('40.00'),
                'max_participants': 12,
                'min_participants': 6,
                'prize_pool': Decimal('1500.00'),
                'rules': 'Individual skills challenges including dribbling, shooting, and passing.',
            },
            {
                'title': 'Elite Badminton Doubles Championship',
                'description': 'Team-based badminton doubles tournament for registered teams',
                'sport_type': 'BADMINTON',
                'registration_type': 'TEAM',
                'team_size': 2,
                'allow_substitutes': False,
                'max_substitutes': 0,
                'date': date.today() + timedelta(days=28),
                'start_time': time(8, 0),
                'end_time': time(19, 0),
                'venue_idx': 3,  # Premier Badminton Academy
                'entry_fee': Decimal('100.00'),
                'max_participants': 8,
                'min_participants': 4,
                'prize_pool': Decimal('3000.00'),
                'rules': 'BWF doubles rules. Best of 3 games to 21 points.',
            },
            {
                'title': 'Metro Futsal Team Championship',
                'description': 'Professional futsal team tournament with 5v5 matches',
                'sport_type': 'FUTSAL',
                'registration_type': 'TEAM',
                'team_size': 5,
                'allow_substitutes': True,
                'max_substitutes': 10,
                'date': date.today() + timedelta(days=35),
                'start_time': time(9, 0),
                'end_time': time(20, 0),
                'venue_idx': 4,  # Metro Futsal Arena
                'entry_fee': Decimal('200.00'),
                'max_participants': 6,
                'min_participants': 4,
                'prize_pool': Decimal('5000.00'),
                'rules': 'FIFA futsal rules. 20-minute halves with unlimited substitutions.',
            },
            {
                'title': 'Community Badminton Open',
                'description': 'Open badminton tournament for players of all skill levels',
                'sport_type': 'BADMINTON',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() + timedelta(days=42),
                'start_time': time(10, 0),
                'end_time': time(16, 0),
                'venue_idx': 2,  # Community Sports Hub
                'entry_fee': Decimal('25.00'),
                'max_participants': 20,
                'min_participants': 8,
                'prize_pool': Decimal('800.00'),
                'rules': 'Modified rules for community play. Best of 3 games to 15 points.',
            },
            {
                'title': 'Summer Futsal Skills Challenge',
                'description': 'Individual futsal tournament focusing on technical skills',
                'sport_type': 'FUTSAL',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() + timedelta(days=49),
                'start_time': time(11, 0),
                'end_time': time(18, 0),
                'venue_idx': 2,  # Community Sports Hub
                'entry_fee': Decimal('35.00'),
                'max_participants': 16,
                'min_participants': 8,
                'prize_pool': Decimal('1200.00'),
                'rules': 'Skills-based competition with multiple challenge rounds.',
            },
        ]
        
        tournaments = []
        for data in tournament_data:
            venue = venues[data.pop('venue_idx')]
            
            tournament = Tournament.objects.create(
                organizer=organizer,
                venue=venue.name,
                venue_address=venue.location,
                linked_venue=venue,
                registration_deadline=timezone.now() + timedelta(days=data['date'].toordinal() - date.today().toordinal() - 3),
                tournament_type='SINGLE_ELIMINATION',
                status='UPCOMING',
                **data
            )
            tournaments.append(tournament)
        
        return tournaments

    def register_participants(self, tournaments, players, teams):
        """Register players and teams for tournaments"""
        self.stdout.write('Registering participants...')
        
        # Register players for individual tournaments
        individual_tournaments = [t for t in tournaments if t.registration_type == 'INDIVIDUAL']
        
        for tournament in individual_tournaments:
            # Register 60-80% of max participants
            num_to_register = int(tournament.max_participants * random.uniform(0.6, 0.8))
            selected_players = random.sample(players, min(num_to_register, len(players)))
            
            for player in selected_players:
                # Check if player's sports match tournament
                if tournament.sport_type in player.preferred_sports:
                    TournamentRegistration.objects.create(
                        tournament=tournament,
                        player=player,
                        status='ACCEPTED'  # Auto-accept for testing
                    )
        
        # Register teams for team tournaments
        team_tournaments = [t for t in tournaments if t.registration_type == 'TEAM']
        
        for tournament in team_tournaments:
            # Get teams that match the sport
            matching_teams = [t for t in teams if tournament.sport_type in t.sport_types]
            
            # Register 50-75% of matching teams (up to max participants)
            num_to_register = min(
                int(len(matching_teams) * random.uniform(0.5, 0.75)),
                tournament.max_participants
            )
            
            selected_teams = random.sample(matching_teams, min(num_to_register, len(matching_teams)))
            
            for team in selected_teams:
                # Get team members for player selection
                members = TeamMembership.objects.filter(team=team, is_active=True)
                selected_players = [m.player for m in members[:tournament.team_size]]
                
                if len(selected_players) >= tournament.team_size:
                    registration = TeamTournamentRegistration.objects.create(
                        tournament=tournament,
                        team=team,
                        registered_by=team.owner,
                        status='CONFIRMED'  # Auto-confirm for testing
                    )
                    registration.selected_players.set(selected_players)

    def create_completed_tournaments(self, organizer, players, venues):
        """Create completed tournaments with results for statistics"""
        self.stdout.write('Creating completed tournaments with results...')
        
        completed_tournament_data = [
            {
                'title': 'Winter Badminton Championship (Completed)',
                'sport_type': 'BADMINTON',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() - timedelta(days=30),
                'participants': 8,
            },
            {
                'title': 'New Year Futsal Cup (Completed)',
                'sport_type': 'FUTSAL',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() - timedelta(days=45),
                'participants': 6,
            },
            {
                'title': 'Holiday Badminton Doubles (Completed)',
                'sport_type': 'BADMINTON',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() - timedelta(days=60),
                'participants': 4,
            },
        ]
        
        for data in completed_tournament_data:
            # Create completed tournament
            tournament = Tournament.objects.create(
                organizer=organizer,
                title=data['title'],
                description=f"Completed tournament for testing statistics",
                sport_type=data['sport_type'],
                tournament_type='SINGLE_ELIMINATION',
                registration_type=data['registration_type'],
                date=data['date'],
                start_time=time(10, 0),
                end_time=time(18, 0),
                venue=venues[0].name,
                venue_address=venues[0].location,
                linked_venue=venues[0],
                entry_fee=Decimal('30.00'),
                max_participants=data['participants'],
                min_participants=data['participants'] // 2,
                registration_deadline=timezone.make_aware(
                    datetime.combine(data['date'] - timedelta(days=7), time(23, 59))
                ),
                prize_pool=Decimal('1000.00'),
                rules='Completed tournament rules',
                status='COMPLETED'
            )
            
            # Register participants
            selected_players = random.sample(players, data['participants'])
            for player in selected_players:
                TournamentRegistration.objects.create(
                    tournament=tournament,
                    player=player,
                    status='ACCEPTED'
                )
            
            # Create and complete matches
            self.create_completed_matches(tournament, selected_players)

    def create_completed_matches(self, tournament, participants):
        """Create completed matches with realistic results"""
        import math
        
        # Calculate bracket structure
        num_participants = len(participants)
        total_rounds = math.ceil(math.log2(num_participants))
        
        # Shuffle participants for random seeding
        shuffled_participants = participants[:]
        random.shuffle(shuffled_participants)
        
        current_round_participants = shuffled_participants[:]
        round_number = 1
        match_number = 1
        
        while len(current_round_participants) > 1:
            next_round_participants = []
            matches_in_round = len(current_round_participants) // 2
            
            for i in range(matches_in_round):
                player1 = current_round_participants[i * 2]
                player2 = current_round_participants[i * 2 + 1]
                
                # Determine winner based on skill levels and some randomness
                p1_skill_value = {'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'PROFESSIONAL': 4}
                p2_skill_value = {'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'PROFESSIONAL': 4}
                
                p1_strength = p1_skill_value.get(player1.skill_level, 2) + random.uniform(-0.5, 0.5)
                p2_strength = p2_skill_value.get(player2.skill_level, 2) + random.uniform(-0.5, 0.5)
                
                winner = player1 if p1_strength > p2_strength else player2
                
                # Generate realistic scores based on sport
                if tournament.sport_type == 'BADMINTON':
                    winner_score = random.randint(18, 21)
                    loser_score = random.randint(10, winner_score - 1)
                else:  # FUTSAL
                    winner_score = random.randint(3, 8)
                    loser_score = random.randint(0, winner_score - 1)
                
                # Create completed match
                match = Match.objects.create(
                    tournament=tournament,
                    round_number=round_number,
                    match_number=match_number,
                    player1=player1,
                    player2=player2,
                    winner=winner,
                    player1_score=winner_score if winner == player1 else loser_score,
                    player2_score=winner_score if winner == player2 else loser_score,
                    scheduled_time=timezone.make_aware(
                        datetime.combine(tournament.date, time(10 + round_number, 0))
                    ),
                    actual_start_time=timezone.make_aware(
                        datetime.combine(tournament.date, time(10 + round_number, 0))
                    ),
                    actual_end_time=timezone.make_aware(
                        datetime.combine(tournament.date, time(10 + round_number, 45))
                    ),
                    status='COMPLETED'
                )
                
                next_round_participants.append(winner)
                match_number += 1
            
            current_round_participants = next_round_participants
            round_number += 1
        
        # Update player statistics based on completed matches
        self.update_player_statistics(tournament)

    def update_player_statistics(self, tournament):
        """Update player statistics based on tournament results"""
        matches = Match.objects.filter(tournament=tournament, status='COMPLETED')
        
        for match in matches:
            # Update player1 stats
            if match.player1:
                match.player1.matches_played += 1
                if match.winner == match.player1:
                    match.player1.matches_won += 1
                
                # Recalculate win rate
                if match.player1.matches_played > 0:
                    match.player1.win_rate = (match.player1.matches_won / match.player1.matches_played) * 100
                
                match.player1.save()
            
            # Update player2 stats
            if match.player2:
                match.player2.matches_played += 1
                if match.winner == match.player2:
                    match.player2.matches_won += 1
                
                # Recalculate win rate
                if match.player2.matches_played > 0:
                    match.player2.win_rate = (match.player2.matches_won / match.player2.matches_played) * 100
                
                match.player2.save()