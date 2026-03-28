"""
Clean seed command for testing all core features.
Usage:
    python manage.py seed_test_data          # seed only
    python manage.py seed_test_data --clear  # wipe DB first, then seed

Users created:
  - 1 admin
  - 2 organizers
  - 20 futsal players  (4 teams × 5 players, each team owner has connections to teammates)
  - 8  badminton players (for individual tournament, 8-player bracket)
  - 2 referees (1 futsal, 1 badminton)
  - 2 venue owners

Teams:
  - futsal_a  players 1-5   (owner = player1)
  - futsal_b  players 6-10  (owner = player6)
  - futsal_c  players 11-15 (owner = player11)
  - futsal_d  players 16-20 (owner = player16)
  - badminton_team  bplayer1-2 (edge-case only)

Tournaments:
  - Futsal Cup 2026        (knockout, TEAM, 4 teams registered, UPCOMING, bracket NOT generated)
  - Badminton Open 2026    (knockout, INDIVIDUAL, 8 players registered, UPCOMING)
  - Futsal League Season 1 (league, TEAM, ONGOING, 2 matches seeded)
  - Pending Badminton Cup  (PENDING approval)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import date, time, timedelta, datetime
from decimal import Decimal

PASSWORD = 'Test1234!'


class Command(BaseCommand):
    help = 'Wipe and re-seed clean test data for all features'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear all data before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_data()
        with transaction.atomic():
            users = self.create_users()
            venues = self.create_venues(users)
            teams = self.create_teams(users)
            tournaments = self.create_tournaments(users, venues)
            self.create_registrations(users, teams, tournaments)
            self.create_referee_data(users, tournaments)
            self.create_connections(users)
        self.stdout.write(self.style.SUCCESS('\n✅ Seed complete.\n'))
        self.print_credentials(users)

    def clear_data(self):
        self.stdout.write('Clearing database...')
        from django.db import connection
        tables = [
            'teams_futsalgoal', 'teams_futsalcard', 'teams_futsalplayerstat', 'teams_futsalscore',
            'teams_badmintonset',
            'tournaments_matchremark', 'tournaments_match',
            'teams_teamtournamentregistration_selected_players',
            'teams_teamtournamentregistration',
            'tournaments_tournamentregistration',
            'tournaments_tournamentauditlog',
            'tournaments_tournament',
            'teams_activityhistory',
            'teams_teamjoinrequest',
            'teams_invitation',
            'teams_teammembership',
            'teams_team',
            'referees_refereebooking',
            'referees_refereeavailability',
            'referees_refereegeneralavailability',
            'referees_refereeprofile',
            'venues_venuebooking',
            'venues_venueavailability',
            'venues_venueauditlog',
            'venues_venue',
            'payments_refund',
            'payments_payment',
            'payments_paymentmethod',
            'accounts_playerjoinrequest',
            'accounts_notification',
            'accounts_adminauditlog',
            'accounts_playerstatistics',
            'accounts_upcomingmatch',
            'chat_message', 'chat_conversationmetadata', 'chat_messageattachment',
            'chat_userpresence', 'chat_chatroomparticipant', 'chat_chatroom',
            'chat_groupmessage', 'chat_groupchat', 'chat_directmessage',
            'chat_conversation',
            'notifications_notification',
            'organizers_organizerprofile',
        ]
        with connection.cursor() as cursor:
            cursor.execute('PRAGMA foreign_keys = OFF')
            for table in tables:
                try:
                    cursor.execute(f'DELETE FROM "{table}"')
                except Exception:
                    pass
            try:
                cursor.execute('DELETE FROM "accounts_customuser"')
            except Exception:
                pass
            cursor.execute('PRAGMA foreign_keys = ON')
        self.stdout.write(self.style.WARNING('  Database cleared.'))

    def create_users(self):
        from django.contrib.auth import get_user_model
        model = get_user_model()
        self.stdout.write('Creating users...')

        def make(email, username, full_name, role, **kwargs):
            u, created = model.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'full_name': full_name,
                    'role': role,
                    'phone_number': '9800000000',
                    'is_verified': True,
                    'approval_status': 'APPROVED',
                    **kwargs,
                }
            )
            if created:
                u.set_password(PASSWORD)
                u.save()
            else:
                # Update key fields in case user already existed
                for field, val in kwargs.items():
                    setattr(u, field, val)
                u.full_name = full_name
                u.role = role
                u.set_password(PASSWORD)
                u.save()
            return u

        users = {}

        users['admin'] = make('admin@test.com', 'admin', 'Test Admin', 'ADMIN',
                              is_staff=True, is_superuser=True)
        users['org1'] = make('org1@test.com', 'org1', 'Alice Organizer', 'ORGANIZER')
        users['org2'] = make('org2@test.com', 'org2', 'Bob Organizer', 'ORGANIZER')

        # 20 futsal players — 4 teams × 5 players
        futsal_names = [
            'Aarav Shah', 'Bikash Rai', 'Chirag Thapa', 'Dipesh Karki', 'Eshan Magar',
            'Firoj Ansari', 'Gaurav Lama', 'Hari Tamang', 'Ishan Gurung', 'Jeevan Shrestha',
            'Kamal Poudel', 'Laxman Bista', 'Manish Oli', 'Nabin Khadka', 'Om Adhikari',
            'Prabesh Dahal', 'Rajesh Tiwari', 'Sagar Bhattarai', 'Tilak Chaudhary', 'Umesh Yadav',
        ]
        for i, name in enumerate(futsal_names, 1):
            users[f'player{i}'] = make(
                f'player{i}@test.com', f'player{i}', name, 'PLAYER',
                preferred_sports=['FUTSAL'],
                skill_level='INTERMEDIATE',
                gender='MALE',
                date_of_birth=date(1998, (i % 12) + 1, (i % 28) + 1),
            )

        # 8 badminton players
        badminton_names = [
            'Anita Gurung', 'Binita Shrestha', 'Chhaya Rai', 'Deepa Tamang',
            'Elina Karki', 'Fiona Magar', 'Gita Thapa', 'Hira Lama',
        ]
        for i, name in enumerate(badminton_names, 1):
            users[f'bplayer{i}'] = make(
                f'bplayer{i}@test.com', f'bplayer{i}', name, 'PLAYER',
                preferred_sports=['BADMINTON'],
                skill_level='INTERMEDIATE',
                gender='FEMALE',
                date_of_birth=date(2000, (i % 12) + 1, (i % 28) + 1),
            )

        users['ref_futsal'] = make('ref_futsal@test.com', 'ref_futsal', 'Carlos Referee', 'REFEREE')
        users['ref_badminton'] = make('ref_badminton@test.com', 'ref_badminton', 'Diana Referee', 'REFEREE')
        users['venue_owner1'] = make('venueowner1@test.com', 'venueowner1', 'Eve VenueOwner', 'VENUE_OWNER',
                                     business_name='Kathmandu Sports Hub', business_registration='REG-001')
        users['venue_owner2'] = make('venueowner2@test.com', 'venueowner2', 'Frank VenueOwner', 'VENUE_OWNER',
                                     business_name='Pokhara Badminton Center', business_registration='REG-002')

        self.stdout.write(f'  Created {len(users)} users.')
        return users

    def create_venues(self, users):
        from venues.models import Venue
        self.stdout.write('Creating venues...')
        venues = {}

        venues['futsal_venue'] = Venue.objects.create(
            owner=users['venue_owner1'],
            name='Kathmandu Futsal Arena',
            location='Thamel, Kathmandu',
            latitude=Decimal('27.715279'),
            longitude=Decimal('85.312500'),
            sport_types=['FUTSAL'],
            court_size='5-a-side',
            facilities='Changing rooms, parking, floodlights',
            capacity=100,
            price_per_hour=Decimal('1500.00'),
            is_active=True,
            default_opening_time=time(6, 0),
            default_closing_time=time(22, 0),
            operating_days=[1, 2, 3, 4, 5, 6, 7],
            approval_status='APPROVED',
        )
        venues['badminton_venue'] = Venue.objects.create(
            owner=users['venue_owner2'],
            name='Pokhara Badminton Hall',
            location='Lakeside, Pokhara',
            latitude=Decimal('28.209000'),
            longitude=Decimal('83.958000'),
            sport_types=['BADMINTON'],
            court_size='Standard',
            facilities='Air conditioning, locker rooms',
            capacity=50,
            price_per_hour=Decimal('800.00'),
            is_active=True,
            default_opening_time=time(7, 0),
            default_closing_time=time(21, 0),
            operating_days=[1, 2, 3, 4, 5, 6, 7],
            approval_status='APPROVED',
        )
        # Pending venue — for venue selection logic / admin approval testing
        venues['pending_venue'] = Venue.objects.create(
            owner=users['venue_owner1'],
            name='Pending Sports Complex',
            location='Lalitpur',
            sport_types=['FUTSAL', 'BADMINTON'],
            court_size='Standard',
            facilities='Basic',
            capacity=40,
            price_per_hour=Decimal('1000.00'),
            is_active=True,
            default_opening_time=time(8, 0),
            default_closing_time=time(20, 0),
            operating_days=[1, 2, 3, 4, 5, 6, 7],
            approval_status='PENDING',
        )
        self.stdout.write(f'  Created {len(venues)} venues.')
        return venues

    def create_teams(self, users):
        from teams.models import Team, TeamMembership
        self.stdout.write('Creating teams...')
        teams = {}

        # 4 futsal teams — each 5 players
        team_defs = [
            ('futsal_a', 'Futsal Alpha',   'player1',  [f'player{i}' for i in range(1, 6)]),
            ('futsal_b', 'Futsal Beta',    'player6',  [f'player{i}' for i in range(6, 11)]),
            ('futsal_c', 'Futsal Gamma',   'player11', [f'player{i}' for i in range(11, 16)]),
            ('futsal_d', 'Futsal Delta',   'player16', [f'player{i}' for i in range(16, 21)]),
        ]
        for key, name, owner_key, member_keys in team_defs:
            teams[key] = Team.objects.create(
                name=name,
                sport_types=['FUTSAL'],
                owner=users[owner_key],
                max_size=10,
                is_active=True,
            )
            for idx, mk in enumerate(member_keys):
                TeamMembership.objects.create(
                    team=teams[key],
                    player=users[mk],
                    role='OWNER' if idx == 0 else 'MEMBER',
                    is_active=True,
                    joined_at=timezone.now(),
                )

        # Badminton team (edge-case: team in individual sport tournament)
        teams['badminton_team'] = Team.objects.create(
            name='Badminton Stars',
            sport_types=['BADMINTON'],
            owner=users['bplayer1'],
            max_size=10,
            is_active=True,
        )
        for idx, mk in enumerate(['bplayer1', 'bplayer2']):
            TeamMembership.objects.create(
                team=teams['badminton_team'],
                player=users[mk],
                role='OWNER' if idx == 0 else 'MEMBER',
                is_active=True,
                joined_at=timezone.now(),
            )

        self.stdout.write(f'  Created {len(teams)} teams.')
        return teams

    def create_tournaments(self, users, venues):
        from tournaments.models import Tournament
        self.stdout.write('Creating tournaments...')
        today = date.today()
        future = today + timedelta(days=30)
        deadline = timezone.now() + timedelta(days=20)
        tournaments = {}

        # 1. Futsal Cup — TEAM knockout, 4 teams, bracket NOT generated yet
        tournaments['futsal_team'] = Tournament.objects.create(
            organizer=users['org1'],
            title='Futsal Cup 2026',
            description='4-team knockout. Register all 4 teams then generate bracket.',
            sport_type='FUTSAL',
            tournament_type='knockout',
            registration_type='TEAM',
            team_size=5,
            allow_substitutes=True,
            max_substitutes=2,
            date=future,
            start_time=time(9, 0),
            end_time=time(18, 0),
            venue='Kathmandu Futsal Arena',
            venue_address='Thamel, Kathmandu',
            linked_venue=venues['futsal_venue'],
            entry_fee=Decimal('500.00'),
            max_participants=4,
            min_participants=4,
            registration_deadline=deadline,
            status='UPCOMING',
            prize_pool=Decimal('10000.00'),
            rules='Standard futsal rules apply.',
            approval_status='APPROVED',
        )

        # 2. Badminton Open — INDIVIDUAL knockout, 8 players
        tournaments['badminton_individual'] = Tournament.objects.create(
            organizer=users['org2'],
            title='Badminton Open 2026',
            description='8-player individual knockout.',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            team_size=1,
            date=future + timedelta(days=7),
            start_time=time(10, 0),
            end_time=time(17, 0),
            venue='Pokhara Badminton Hall',
            venue_address='Lakeside, Pokhara',
            linked_venue=venues['badminton_venue'],
            entry_fee=Decimal('200.00'),
            max_participants=8,
            min_participants=4,
            registration_deadline=deadline + timedelta(days=7),
            status='UPCOMING',
            prize_pool=Decimal('5000.00'),
            rules='BWF rules apply.',
            approval_status='APPROVED',
        )

        # 3. Futsal League — ONGOING, 2 teams, has completed + scheduled matches
        tournaments['futsal_league'] = Tournament.objects.create(
            organizer=users['org1'],
            title='Futsal League Season 1',
            description='Round-robin league. Match 1 completed, Match 2 scheduled.',
            sport_type='FUTSAL',
            tournament_type='league',
            registration_type='TEAM',
            team_size=5,
            date=today - timedelta(days=5),
            start_time=time(9, 0),
            end_time=time(20, 0),
            venue='Kathmandu Futsal Arena',
            venue_address='Thamel, Kathmandu',
            linked_venue=venues['futsal_venue'],
            entry_fee=Decimal('300.00'),
            max_participants=4,
            min_participants=2,
            registration_deadline=timezone.now() - timedelta(days=10),
            status='ONGOING',
            prize_pool=Decimal('8000.00'),
            rules='League rules apply.',
            approval_status='APPROVED',
        )

        # 4. Pending tournament — for admin approval testing
        tournaments['pending_tournament'] = Tournament.objects.create(
            organizer=users['org2'],
            title='Pending Badminton Cup',
            description='Awaiting admin approval.',
            sport_type='BADMINTON',
            tournament_type='knockout',
            registration_type='INDIVIDUAL',
            team_size=1,
            date=future + timedelta(days=14),
            start_time=time(9, 0),
            end_time=time(17, 0),
            venue='Pokhara Badminton Hall',
            venue_address='Lakeside, Pokhara',
            entry_fee=Decimal('150.00'),
            max_participants=8,
            min_participants=4,
            registration_deadline=deadline + timedelta(days=14),
            status='UPCOMING',
            approval_status='PENDING',
        )

        self.stdout.write(f'  Created {len(tournaments)} tournaments.')
        return tournaments

    def create_registrations(self, users, teams, tournaments):
        from tournaments.models import TournamentRegistration, Match
        from teams.models import TeamTournamentRegistration
        self.stdout.write('Creating registrations and matches...')
        today = date.today()

        # All 8 badminton players registered individually
        for i in range(1, 9):
            TournamentRegistration.objects.get_or_create(
                tournament=tournaments['badminton_individual'],
                player=users[f'bplayer{i}'],
                defaults={'status': 'ACCEPTED'},
            )

        # All 4 futsal teams registered for Futsal Cup (bracket-ready)
        for team_key in ['futsal_a', 'futsal_b', 'futsal_c', 'futsal_d']:
            reg, _ = TeamTournamentRegistration.objects.get_or_create(
                tournament=tournaments['futsal_team'],
                team=teams[team_key],
                defaults={
                    'registered_by': teams[team_key].owner,
                    'status': 'CONFIRMED',
                },
            )
            reg.selected_players.set(
                teams[team_key].memberships.filter(is_active=True).values_list('player', flat=True)
            )

        # 2 teams registered for the ongoing league
        for team_key in ['futsal_a', 'futsal_b']:
            reg, _ = TeamTournamentRegistration.objects.get_or_create(
                tournament=tournaments['futsal_league'],
                team=teams[team_key],
                defaults={
                    'registered_by': teams[team_key].owner,
                    'status': 'CONFIRMED',
                },
            )
            reg.selected_players.set(
                teams[team_key].memberships.filter(is_active=True).values_list('player', flat=True)
            )

        # Match 1: COMPLETED — for bracket-edit restriction testing
        Match.objects.create(
            tournament=tournaments['futsal_league'],
            round_number=1,
            match_number=1,
            team1=teams['futsal_a'],
            team2=teams['futsal_b'],
            player1_score=3,
            player2_score=1,
            winning_team=teams['futsal_a'],
            scheduled_time=timezone.make_aware(
                datetime.combine(today - timedelta(days=3), time(10, 0))
            ),
            actual_start_time=timezone.make_aware(
                datetime.combine(today - timedelta(days=3), time(10, 5))
            ),
            actual_end_time=timezone.make_aware(
                datetime.combine(today - timedelta(days=3), time(10, 50))
            ),
            status='COMPLETED',
            notes='First league match — completed.',
        )

        # Match 2: SCHEDULED — for scheduling / referee booking / remarks tests
        Match.objects.create(
            tournament=tournaments['futsal_league'],
            round_number=1,
            match_number=2,
            team1=teams['futsal_a'],
            team2=teams['futsal_b'],
            scheduled_time=timezone.make_aware(
                datetime.combine(today + timedelta(days=2), time(14, 0))
            ),
            status='SCHEDULED',
        )

        self.stdout.write('  Registrations and matches created.')

    def create_referee_data(self, users, tournaments):
        from referees.models import (
            RefereeProfile, RefereeAvailability,
            RefereeGeneralAvailability, RefereeBooking,
        )
        from tournaments.models import Match
        self.stdout.write('Creating referee data...')
        today = date.today()

        RefereeProfile.objects.get_or_create(
            user=users['ref_futsal'],
            defaults={
                'certification_level': 'LEVEL_3',
                'sports_specialization': ['FUTSAL'],
                'years_experience': 5,
                'license_number': 'REF-FUTSAL-001',
                'license_expiry': date(2027, 12, 31),
                'is_verified': True,
                'rating': 4.5,
                'total_matches_officiated': 50,
                'default_fee_per_match': Decimal('1500.00'),
                'default_fee_per_session': Decimal('3000.00'),
            }
        )
        RefereeProfile.objects.get_or_create(
            user=users['ref_badminton'],
            defaults={
                'certification_level': 'LEVEL_2',
                'sports_specialization': ['BADMINTON'],
                'years_experience': 3,
                'license_number': 'REF-BADMINTON-001',
                'license_expiry': date(2027, 6, 30),
                'is_verified': True,
                'rating': 4.2,
                'total_matches_officiated': 30,
                'default_fee_per_match': Decimal('1000.00'),
                'default_fee_per_session': Decimal('2000.00'),
            }
        )

        weekly = {
            day: {'enabled': True, 'start_time': '08:00', 'end_time': '20:00'}
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
        for ref_key in ['ref_futsal', 'ref_badminton']:
            RefereeGeneralAvailability.objects.get_or_create(
                referee=users[ref_key],
                defaults={'weekly_pattern': weekly}
            )

        for delta in range(14):
            avail_date = today + timedelta(days=delta)
            RefereeAvailability.objects.get_or_create(
                referee=users['ref_futsal'], available_date=avail_date,
                defaults={
                    'start_time': time(8, 0), 'end_time': time(20, 0),
                    'is_available': True,
                    'fee_per_match': Decimal('1500.00'),
                    'fee_per_session': Decimal('3000.00'),
                    'notes': 'Available for futsal',
                }
            )
            RefereeAvailability.objects.get_or_create(
                referee=users['ref_badminton'], available_date=avail_date,
                defaults={
                    'start_time': time(9, 0), 'end_time': time(18, 0),
                    'is_available': True,
                    'fee_per_match': Decimal('1000.00'),
                    'fee_per_session': Decimal('2000.00'),
                    'notes': 'Available for badminton',
                }
            )

        scheduled_match = Match.objects.filter(
            tournament=tournaments['futsal_league'], status='SCHEDULED'
        ).first()
        if scheduled_match:
            RefereeBooking.objects.get_or_create(
                referee=users['ref_futsal'],
                tournament=tournaments['futsal_league'],
                defaults={
                    'match': scheduled_match,
                    'requested_by': users['org1'],
                    'status': 'ACCEPTED',
                    'match_date': scheduled_match.scheduled_time,
                    'fee': Decimal('1500.00'),
                    'payment_status': 'PENDING',
                    'notes': 'Booked for league match 2',
                }
            )
        self.stdout.write('  Referee data created.')

    def create_connections(self, users):
        from accounts.models import PlayerJoinRequest
        self.stdout.write('Creating player connections...')

        # Each team owner is connected to all their teammates
        team_groups = [
            [f'player{i}' for i in range(1, 6)],
            [f'player{i}' for i in range(6, 11)],
            [f'player{i}' for i in range(11, 16)],
            [f'player{i}' for i in range(16, 21)],
            ['bplayer1', 'bplayer2', 'bplayer3', 'bplayer4'],
        ]
        for group in team_groups:
            owner = group[0]
            for member in group[1:]:
                PlayerJoinRequest.objects.get_or_create(
                    from_player=users[owner],
                    to_player=users[member],
                    defaults={'status': 'accepted'},
                )

        # Cross-team connections (for team creation with connections testing)
        cross = [('player1', 'player6'), ('player6', 'player11'), ('player11', 'player16')]
        for a, b in cross:
            PlayerJoinRequest.objects.get_or_create(
                from_player=users[a], to_player=users[b],
                defaults={'status': 'accepted'},
            )

        # One pending request — for connection flow testing
        PlayerJoinRequest.objects.get_or_create(
            from_player=users['player5'],
            to_player=users['player10'],
            defaults={'status': 'pending'},
        )
        self.stdout.write('  Connections created.')

    def print_credentials(self, users):
        rows = [
            ('ADMIN',                          'admin@test.com'),
            ('ORGANIZER (futsal)',              'org1@test.com'),
            ('ORGANIZER (badminton)',           'org2@test.com'),
            ('PLAYER owner futsal_a',           'player1@test.com'),
            ('PLAYER futsal_a member',          'player2@test.com'),
            ('PLAYER futsal_a member',          'player3@test.com'),
            ('PLAYER futsal_a member',          'player4@test.com'),
            ('PLAYER futsal_a member',          'player5@test.com'),
            ('PLAYER owner futsal_b',           'player6@test.com'),
            ('PLAYER futsal_b member',          'player7@test.com'),
            ('PLAYER futsal_b member',          'player8@test.com'),
            ('PLAYER futsal_b member',          'player9@test.com'),
            ('PLAYER futsal_b member',          'player10@test.com'),
            ('PLAYER owner futsal_c',           'player11@test.com'),
            ('PLAYER futsal_c member',          'player12@test.com'),
            ('PLAYER futsal_c member',          'player13@test.com'),
            ('PLAYER futsal_c member',          'player14@test.com'),
            ('PLAYER futsal_c member',          'player15@test.com'),
            ('PLAYER owner futsal_d',           'player16@test.com'),
            ('PLAYER futsal_d member',          'player17@test.com'),
            ('PLAYER futsal_d member',          'player18@test.com'),
            ('PLAYER futsal_d member',          'player19@test.com'),
            ('PLAYER futsal_d member',          'player20@test.com'),
            ('PLAYER badminton (bplayer1-8)',    'bplayer1@test.com .. bplayer8@test.com'),
            ('REFEREE Futsal (verified)',        'ref_futsal@test.com'),
            ('REFEREE Badminton (verified)',     'ref_badminton@test.com'),
            ('VENUE_OWNER (Futsal Arena)',       'venueowner1@test.com'),
            ('VENUE_OWNER (Badminton Hall)',     'venueowner2@test.com'),
        ]
        self.stdout.write('─' * 65)
        self.stdout.write(f'  SEED CREDENTIALS  (all passwords: {PASSWORD})')
        self.stdout.write('─' * 65)
        self.stdout.write(f'  {"Role / Notes":<38} {"Email":<30}')
        self.stdout.write('─' * 65)
        for role, email in rows:
            self.stdout.write(f'  {role:<38} {email:<30}')
        self.stdout.write('─' * 65)
        self.stdout.write('')
