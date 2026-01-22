from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import random
import uuid

from accounts.models import CustomUser
from referees.models import RefereeProfile, RefereeAvailability, RefereeBooking, RefereeRating
from venues.models import Venue, VenueAvailability, VenueBooking
from tournaments.models import Tournament, TournamentRegistration, Match
from organizers.models import TournamentTemplate


class Command(BaseCommand):
    help = 'Seed comprehensive data for testing the ArenaX application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            self.clear_data()

        self.stdout.write('Creating comprehensive seed data...')
        
        # Create users
        users = self.create_users()
        
        # Create venues
        venues = self.create_venues(users)
        
        # Create tournaments
        tournaments = self.create_tournaments(users, venues)
        
        # Create referee data
        self.create_referee_data(users, tournaments)
        
        # Create venue bookings
        self.create_venue_bookings(users, venues)
        
        # Create tournament registrations
        self.create_tournament_registrations(users, tournaments)

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded comprehensive data!')
        )

    def clear_data(self):
        """Clear existing data"""
        RefereeBooking.objects.all().delete()
        RefereeRating.objects.all().delete()
        RefereeAvailability.objects.all().delete()
        RefereeProfile.objects.all().delete()
        TournamentRegistration.objects.all().delete()
        Match.objects.all().delete()
        Tournament.objects.all().delete()
        VenueBooking.objects.all().delete()
        VenueAvailability.objects.all().delete()
        Venue.objects.all().delete()
        CustomUser.objects.filter(is_superuser=False).delete()

    def create_users(self):
        """Create diverse users for testing"""
        users = {}
        
        # Create admin user
        admin, created = CustomUser.objects.get_or_create(
            email='admin@arenax.com',
            defaults={
                'username': 'admin',
                'full_name': 'ArenaX Admin',
                'phone_number': '+1234567890',
                'role': 'ADMIN',
                'is_verified': True,
                'is_staff': True,
                'is_superuser': True,
                'password': make_password('admin123'),
            }
        )
        users['admin'] = admin

        # Create referees
        referee_data = [
            {
                'email': 'john.referee@arenax.com',
                'username': 'john_referee',
                'full_name': 'John Smith',
                'phone_number': '+1234567891',
                'bio': 'Experienced futsal referee with 10+ years of experience.',
                'location': 'New York, NY',
                'certification': 'LEVEL_3',
                'sports': ['FUTSAL', 'FOOTBALL'],
                'experience': 12,
                'matches': 150
            },
            {
                'email': 'sarah.referee@arenax.com',
                'username': 'sarah_referee',
                'full_name': 'Sarah Johnson',
                'phone_number': '+1234567892',
                'bio': 'Professional badminton referee and former player.',
                'location': 'Los Angeles, CA',
                'certification': 'LEVEL_4',
                'sports': ['BADMINTON'],
                'experience': 8,
                'matches': 95
            },
            {
                'email': 'mike.referee@arenax.com',
                'username': 'mike_referee',
                'full_name': 'Mike Wilson',
                'phone_number': '+1234567893',
                'bio': 'Multi-sport referee specializing in indoor sports.',
                'location': 'Chicago, IL',
                'certification': 'LEVEL_2',
                'sports': ['FUTSAL', 'BADMINTON'],
                'experience': 5,
                'matches': 67
            }
        ]

        for ref_data in referee_data:
            user, created = CustomUser.objects.get_or_create(
                email=ref_data['email'],
                defaults={
                    'username': ref_data['username'],
                    'full_name': ref_data['full_name'],
                    'phone_number': ref_data['phone_number'],
                    'role': 'REFEREE',
                    'is_verified': True,
                    'bio': ref_data['bio'],
                    'location': ref_data['location'],
                    'password': make_password('referee123'),
                }
            )
            users[f'referee_{ref_data["username"]}'] = user

            # Create referee profile
            if created or not hasattr(user, 'referee_profile'):
                RefereeProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'certification_level': ref_data['certification'],
                        'sports_specialization': ref_data['sports'],
                        'years_experience': ref_data['experience'],
                        'total_matches_officiated': ref_data['matches'],
                        'rating': round(random.uniform(3.5, 5.0), 1),
                        'is_verified': True,
                        'license_number': f'REF{random.randint(1000, 9999)}',
                    }
                )

        # Create organizers
        organizer_data = [
            {
                'email': 'alex.organizer@arenax.com',
                'username': 'alex_organizer',
                'full_name': 'Alex Rodriguez',
                'phone_number': '+1234567894',
                'bio': 'Tournament organizer specializing in futsal competitions.',
                'location': 'Miami, FL'
            },
            {
                'email': 'emma.organizer@arenax.com',
                'username': 'emma_organizer',
                'full_name': 'Emma Thompson',
                'phone_number': '+1234567895',
                'bio': 'Professional badminton tournament organizer.',
                'location': 'Seattle, WA'
            }
        ]

        for org_data in organizer_data:
            user, created = CustomUser.objects.get_or_create(
                email=org_data['email'],
                defaults={
                    'username': org_data['username'],
                    'full_name': org_data['full_name'],
                    'phone_number': org_data['phone_number'],
                    'role': 'ORGANIZER',
                    'is_verified': True,
                    'bio': org_data['bio'],
                    'location': org_data['location'],
                    'password': make_password('organizer123'),
                }
            )
            users[f'organizer_{org_data["username"]}'] = user

        # Create venue owners
        venue_owner_data = [
            {
                'email': 'david.venue@arenax.com',
                'username': 'david_venue',
                'full_name': 'David Chen',
                'phone_number': '+1234567896',
                'business_name': 'Elite Sports Complex',
                'location': 'San Francisco, CA'
            },
            {
                'email': 'lisa.venue@arenax.com',
                'username': 'lisa_venue',
                'full_name': 'Lisa Martinez',
                'phone_number': '+1234567897',
                'business_name': 'Metro Sports Center',
                'location': 'Boston, MA'
            }
        ]

        for venue_data in venue_owner_data:
            user, created = CustomUser.objects.get_or_create(
                email=venue_data['email'],
                defaults={
                    'username': venue_data['username'],
                    'full_name': venue_data['full_name'],
                    'phone_number': venue_data['phone_number'],
                    'role': 'VENUE_OWNER',
                    'is_verified': True,
                    'business_name': venue_data['business_name'],
                    'location': venue_data['location'],
                    'password': make_password('venue123'),
                }
            )
            users[f'venue_{venue_data["username"]}'] = user

        # Create players
        player_data = [
            {
                'email': 'player1@arenax.com',
                'username': 'player1',
                'full_name': 'Carlos Silva',
                'phone_number': '+1234567898',
                'skill_level': 'ADVANCED',
                'sports': ['FUTSAL']
            },
            {
                'email': 'player2@arenax.com',
                'username': 'player2',
                'full_name': 'Maria Garcia',
                'phone_number': '+1234567899',
                'skill_level': 'INTERMEDIATE',
                'sports': ['BADMINTON']
            },
            {
                'email': 'player3@arenax.com',
                'username': 'player3',
                'full_name': 'James Brown',
                'phone_number': '+1234567800',
                'skill_level': 'PROFESSIONAL',
                'sports': ['FUTSAL', 'BADMINTON']
            },
            {
                'email': 'player4@arenax.com',
                'username': 'player4',
                'full_name': 'Anna Lee',
                'phone_number': '+1234567801',
                'skill_level': 'BEGINNER',
                'sports': ['BADMINTON']
            }
        ]

        for player_data_item in player_data:
            user, created = CustomUser.objects.get_or_create(
                email=player_data_item['email'],
                defaults={
                    'username': player_data_item['username'],
                    'full_name': player_data_item['full_name'],
                    'phone_number': player_data_item['phone_number'],
                    'role': 'PLAYER',
                    'is_verified': True,
                    'skill_level': player_data_item['skill_level'],
                    'preferred_sports': player_data_item['sports'],
                    'password': make_password('player123'),
                }
            )
            users[f'player_{player_data_item["username"]}'] = user

        return users

    def create_venues(self, users):
        """Create venues with availability"""
        venues = []
        
        venue_data = [
            {
                'name': 'Elite Sports Complex',
                'location': '123 Sports Ave, San Francisco, CA',
                'sport_type': 'FUTSAL',
                'capacity': 50,
                'price': 150.00,
                'facilities': 'Professional futsal court, changing rooms, parking, refreshments',
                'owner_key': 'venue_david_venue'
            },
            {
                'name': 'Metro Sports Center Court 1',
                'location': '456 Metro St, Boston, MA',
                'sport_type': 'BADMINTON',
                'capacity': 30,
                'price': 80.00,
                'facilities': 'Indoor badminton court, equipment rental, air conditioning',
                'owner_key': 'venue_lisa_venue'
            },
            {
                'name': 'Metro Sports Center Court 2',
                'location': '456 Metro St, Boston, MA',
                'sport_type': 'FUTSAL',
                'capacity': 40,
                'price': 120.00,
                'facilities': 'Indoor futsal court, sound system, LED lighting',
                'owner_key': 'venue_lisa_venue'
            },
            {
                'name': 'Elite Sports Complex Court 2',
                'location': '123 Sports Ave, San Francisco, CA',
                'sport_type': 'BADMINTON',
                'capacity': 25,
                'price': 90.00,
                'facilities': 'Premium badminton court, professional lighting, equipment storage',
                'owner_key': 'venue_david_venue'
            }
        ]

        for venue_info in venue_data:
            venue, created = Venue.objects.get_or_create(
                name=venue_info['name'],
                defaults={
                    'owner': users[venue_info['owner_key']],
                    'location': venue_info['location'],
                    'sport_type': venue_info['sport_type'],
                    'capacity': venue_info['capacity'],
                    'price_per_hour': Decimal(str(venue_info['price'])),
                    'facilities': venue_info['facilities'],
                }
            )
            venues.append(venue)

            # Create availability for the next 30 days
            if created:
                for i in range(30):
                    future_date = date.today() + timedelta(days=i)
                    
                    # Create longer time slots suitable for tournaments
                    time_slots = [
                        (time(8, 0), time(14, 0)),   # Morning to afternoon (6 hours)
                        (time(14, 0), time(22, 0)),  # Afternoon to evening (8 hours)
                        (time(9, 0), time(17, 0)),   # Business hours (8 hours)
                    ]
                    
                    for start_time, end_time in time_slots:
                        VenueAvailability.objects.get_or_create(
                            venue=venue,
                            date=future_date,
                            start_time=start_time,
                            end_time=end_time,
                            defaults={'is_available': True}
                        )

        return venues

    def create_tournaments(self, users, venues):
        """Create tournaments"""
        tournaments = []
        
        tournament_data = [
            {
                'title': 'Spring Futsal Championship 2024',
                'description': 'Annual spring futsal tournament featuring teams from across the region.',
                'sport_type': 'FUTSAL',
                'date': date.today() + timedelta(days=15),
                'start_time': time(10, 0),
                'end_time': time(18, 0),
                'entry_fee': 50.00,
                'max_participants': 16,
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 0,
                'status': 'UPCOMING'
            },
            {
                'title': 'Badminton Masters Tournament',
                'description': 'Elite badminton competition for advanced players.',
                'sport_type': 'BADMINTON',
                'date': date.today() + timedelta(days=22),
                'start_time': time(9, 0),
                'end_time': time(17, 0),
                'entry_fee': 35.00,
                'max_participants': 32,
                'organizer_key': 'organizer_emma_organizer',
                'venue_index': 1,
                'status': 'UPCOMING'
            },
            {
                'title': 'Weekend Futsal League',
                'description': 'Casual weekend futsal matches for all skill levels.',
                'sport_type': 'FUTSAL',
                'date': date.today() + timedelta(days=8),
                'start_time': time(14, 0),
                'end_time': time(20, 0),
                'entry_fee': 25.00,
                'max_participants': 12,
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 2,
                'status': 'UPCOMING'
            },
            {
                'title': 'Badminton Beginners Cup',
                'description': 'Tournament designed for beginner and intermediate players.',
                'sport_type': 'BADMINTON',
                'date': date.today() + timedelta(days=30),
                'start_time': time(11, 0),
                'end_time': time(16, 0),
                'entry_fee': 20.00,
                'max_participants': 24,
                'organizer_key': 'organizer_emma_organizer',
                'venue_index': 3,
                'status': 'UPCOMING'
            }
        ]

        for tournament_info in tournament_data:
            venue = venues[tournament_info['venue_index']]
            tournament, created = Tournament.objects.get_or_create(
                title=tournament_info['title'],
                defaults={
                    'organizer': users[tournament_info['organizer_key']],
                    'description': tournament_info['description'],
                    'sport_type': tournament_info['sport_type'],
                    'date': tournament_info['date'],
                    'start_time': tournament_info['start_time'],
                    'end_time': tournament_info['end_time'],
                    'venue': venue.name,
                    'venue_address': venue.location,
                    'linked_venue': venue,
                    'entry_fee': Decimal(str(tournament_info['entry_fee'])),
                    'max_participants': tournament_info['max_participants'],
                    'min_participants': 4,
                    'registration_deadline': timezone.now() + timedelta(days=tournament_info['date'].day - date.today().day - 1),
                    'status': tournament_info['status'],
                    'prize_pool': Decimal(str(tournament_info['entry_fee'] * tournament_info['max_participants'] * 0.8)),
                }
            )
            tournaments.append(tournament)

        return tournaments

    def create_referee_data(self, users, tournaments):
        """Create referee availability and bookings"""
        referees = [user for key, user in users.items() if key.startswith('referee_')]
        
        # Create availability for referees
        for referee in referees:
            # Create availability for the next 45 days
            for i in range(45):
                future_date = date.today() + timedelta(days=i)
                
                # Skip some days randomly to make it realistic
                if random.random() < 0.3:  # 30% chance to skip a day
                    continue
                
                # Create availability slots
                if random.random() < 0.7:  # 70% chance for morning availability
                    RefereeAvailability.objects.get_or_create(
                        referee=referee,
                        available_date=future_date,
                        start_time=time(8, 0),
                        end_time=time(14, 0),
                        defaults={
                            'is_available': True,
                            'notes': 'Available for morning tournaments'
                        }
                    )
                
                if random.random() < 0.8:  # 80% chance for evening availability
                    RefereeAvailability.objects.get_or_create(
                        referee=referee,
                        available_date=future_date,
                        start_time=time(14, 0),
                        end_time=time(22, 0),
                        defaults={
                            'is_available': True,
                            'notes': 'Available for afternoon/evening tournaments'
                        }
                    )

        # Create some referee bookings for tournaments
        for tournament in tournaments:
            # Randomly assign referees to some tournaments
            if random.random() < 0.6:  # 60% chance to have a referee assigned
                available_referees = []
                
                for referee in referees:
                    # Check if referee is available for this tournament
                    availability = RefereeAvailability.objects.filter(
                        referee=referee,
                        available_date=tournament.date,
                        is_available=True,
                        start_time__lte=tournament.start_time,
                        end_time__gte=tournament.end_time or tournament.start_time
                    ).first()
                    
                    if availability:
                        available_referees.append(referee)
                
                if available_referees:
                    selected_referee = random.choice(available_referees)
                    
                    # Create a match for the tournament if it doesn't exist
                    match, created = Match.objects.get_or_create(
                        tournament=tournament,
                        round_number=1,
                        match_number=1,
                        defaults={
                            'scheduled_time': datetime.combine(tournament.date, tournament.start_time)
                        }
                    )
                    
                    # Create referee booking
                    booking, created = RefereeBooking.objects.get_or_create(
                        referee=selected_referee,
                        match=match,
                        tournament=tournament,
                        defaults={
                            'requested_by': tournament.organizer,
                            'match_date': datetime.combine(tournament.date, tournament.start_time),
                            'fee': Decimal(str(random.uniform(50, 150))),
                            'status': random.choice(['REQUESTED', 'ACCEPTED', 'COMPLETED']),
                            'notes': f'Referee assignment for {tournament.title}'
                        }
                    )
                    
                    # Create rating if booking is completed
                    if booking.status == 'COMPLETED':
                        RefereeRating.objects.get_or_create(
                            referee=selected_referee,
                            organizer=tournament.organizer,
                            match=match,
                            tournament=tournament,
                            defaults={
                                'rating': random.randint(3, 5),
                                'comment': random.choice([
                                    'Excellent referee, very professional',
                                    'Good performance, fair decisions',
                                    'Great communication with players',
                                    'Handled the match very well',
                                    'Professional and punctual'
                                ])
                            }
                        )

        # Ensure John referee has some ratings by creating additional completed bookings
        john_referee = users.get('referee_john_referee')
        if john_referee:
            # Create some past completed bookings for John with ratings
            past_tournaments = [
                {
                    'title': 'Summer Futsal League 2023',
                    'organizer': users['organizer_alex_organizer'],
                    'date': date.today() - timedelta(days=30),
                    'rating': 5,
                    'comment': 'Outstanding referee performance, very professional and fair'
                },
                {
                    'title': 'Regional Championship 2023',
                    'organizer': users['organizer_emma_organizer'],
                    'date': date.today() - timedelta(days=45),
                    'rating': 4,
                    'comment': 'Great job managing the match, good communication'
                },
                {
                    'title': 'Youth Tournament 2023',
                    'organizer': users['organizer_alex_organizer'],
                    'date': date.today() - timedelta(days=60),
                    'rating': 5,
                    'comment': 'Excellent with young players, very patient and fair'
                }
            ]
            
            for past_tournament in past_tournaments:
                # Create a past tournament
                tournament, created = Tournament.objects.get_or_create(
                    title=past_tournament['title'],
                    defaults={
                        'organizer': past_tournament['organizer'],
                        'description': f'Past tournament for rating purposes',
                        'sport_type': 'FUTSAL',
                        'date': past_tournament['date'],
                        'start_time': time(10, 0),
                        'end_time': time(18, 0),
                        'venue': 'Test Venue',
                        'venue_address': 'Test Address',
                        'entry_fee': Decimal('25.00'),
                        'max_participants': 16,
                        'min_participants': 4,
                        'registration_deadline': timezone.now() - timedelta(days=70),
                        'status': 'COMPLETED',
                        'prize_pool': Decimal('400.00'),
                    }
                )
                
                # Create match
                match, created = Match.objects.get_or_create(
                    tournament=tournament,
                    round_number=1,
                    match_number=1,
                    defaults={
                        'scheduled_time': datetime.combine(past_tournament['date'], time(10, 0))
                    }
                )
                
                # Create completed booking
                booking, created = RefereeBooking.objects.get_or_create(
                    referee=john_referee,
                    match=match,
                    tournament=tournament,
                    defaults={
                        'requested_by': past_tournament['organizer'],
                        'match_date': datetime.combine(past_tournament['date'], time(10, 0)),
                        'fee': Decimal('75.00'),
                        'status': 'COMPLETED',
                        'notes': f'Completed referee assignment for {past_tournament["title"]}'
                    }
                )
                
                # Create rating
                RefereeRating.objects.get_or_create(
                    referee=john_referee,
                    organizer=past_tournament['organizer'],
                    match=match,
                    tournament=tournament,
                    defaults={
                        'rating': past_tournament['rating'],
                        'comment': past_tournament['comment']
                    }
                )

    def create_venue_bookings(self, users, venues):
        """Create some venue bookings"""
        organizers = [user for key, user in users.items() if key.startswith('organizer_')]
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        # Create some bookings
        for i in range(10):
            venue = random.choice(venues)
            user = random.choice(organizers + players)
            
            # Find an available slot
            future_date = date.today() + timedelta(days=random.randint(1, 20))
            available_slot = VenueAvailability.objects.filter(
                venue=venue,
                date=future_date,
                is_available=True
            ).first()
            
            if available_slot:
                VenueBooking.objects.get_or_create(
                    venue=venue,
                    user=user,
                    date=future_date,
                    start_time=available_slot.start_time,
                    end_time=available_slot.end_time,
                    defaults={
                        'purpose': random.choice([
                            'Training session',
                            'Private match',
                            'Team practice',
                            'Tournament preparation'
                        ]),
                        'status': random.choice(['PENDING', 'CONFIRMED']),
                        'payment_status': 'PENDING'
                    }
                )

    def create_tournament_registrations(self, users, tournaments):
        """Create tournament registrations"""
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        for tournament in tournaments:
            # Register some players for each tournament
            num_registrations = random.randint(3, min(len(players), tournament.max_participants))
            selected_players = random.sample(players, num_registrations)
            
            for player in selected_players:
                TournamentRegistration.objects.get_or_create(
                    tournament=tournament,
                    player=player,
                    defaults={
                        'status': random.choice(['PENDING', 'ACCEPTED']),
                        'notes': f'Registration for {tournament.title}'
                    }
                )