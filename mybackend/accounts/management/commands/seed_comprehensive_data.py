from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import random
import uuid

from accounts.models import CustomUser, Notification, PlayerJoinRequest, PlayerStatistics, UpcomingMatch
from referees.models import RefereeProfile, RefereeAvailability, RefereeBooking, RefereeRating
from venues.models import Venue, VenueAvailability, VenueBooking
from tournaments.models import Tournament, TournamentRegistration, Match
from teams.models import Team, TeamMembership, Invitation, ActivityHistory, TeamTournamentRegistration, FutsalScore, FutsalPlayerStat, BadmintonSet
from chat.models import Message, ChatMessage
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
        
        # Create teams
        teams = self.create_teams(users)
        
        # Create tournaments (both individual and team-based)
        tournaments = self.create_tournaments(users, venues)
        
        # Create referee data
        self.create_referee_data(users, tournaments)
        
        # Create venue bookings
        self.create_venue_bookings(users, venues)
        
        # Create tournament registrations
        self.create_tournament_registrations(users, tournaments)
        
        # Create team tournament registrations
        self.create_team_tournament_registrations(teams, tournaments)
        
        # Create player connections and notifications
        self.create_player_connections(users)
        
        # Create chat messages
        self.create_chat_messages(users)
        
        # Create player statistics
        self.create_player_statistics(users)

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded comprehensive data!')
        )

    def clear_data(self):
        """Clear existing data"""
        # Clear team-related data first
        TeamTournamentRegistration.objects.all().delete()
        FutsalPlayerStat.objects.all().delete()
        FutsalScore.objects.all().delete()
        BadmintonSet.objects.all().delete()
        ActivityHistory.objects.all().delete()
        Invitation.objects.all().delete()
        TeamMembership.objects.all().delete()
        Team.objects.all().delete()
        
        # Clear chat data
        Message.objects.all().delete()
        ChatMessage.objects.all().delete()
        
        # Clear other data
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
        
        # Clear user-related data
        PlayerJoinRequest.objects.all().delete()
        Notification.objects.all().delete()
        PlayerStatistics.objects.all().delete()
        UpcomingMatch.objects.all().delete()
        
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

        # Create players (expanded to 50+ players)
        player_names = [
            ('Carlos Silva', 'ADVANCED', ['FUTSAL'], 'carlos.silva@arenax.com', 'carlos_silva'),
            ('Maria Garcia', 'INTERMEDIATE', ['BADMINTON'], 'maria.garcia@arenax.com', 'maria_garcia'),
            ('James Brown', 'PROFESSIONAL', ['FUTSAL', 'BADMINTON'], 'james.brown@arenax.com', 'james_brown'),
            ('Anna Lee', 'BEGINNER', ['BADMINTON'], 'anna.lee@arenax.com', 'anna_lee'),
            ('Roberto Martinez', 'ADVANCED', ['FUTSAL'], 'roberto.martinez@arenax.com', 'roberto_martinez'),
            ('Sophie Chen', 'INTERMEDIATE', ['BADMINTON'], 'sophie.chen@arenax.com', 'sophie_chen'),
            ('Michael Johnson', 'PROFESSIONAL', ['FUTSAL'], 'michael.johnson@arenax.com', 'michael_johnson'),
            ('Elena Rodriguez', 'ADVANCED', ['BADMINTON'], 'elena.rodriguez@arenax.com', 'elena_rodriguez'),
            ('David Kim', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON'], 'david.kim@arenax.com', 'david_kim'),
            ('Isabella Santos', 'BEGINNER', ['FUTSAL'], 'isabella.santos@arenax.com', 'isabella_santos'),
            ('Ahmed Hassan', 'ADVANCED', ['FUTSAL'], 'ahmed.hassan@arenax.com', 'ahmed_hassan'),
            ('Priya Patel', 'INTERMEDIATE', ['BADMINTON'], 'priya.patel@arenax.com', 'priya_patel'),
            ('Lucas Thompson', 'PROFESSIONAL', ['BADMINTON'], 'lucas.thompson@arenax.com', 'lucas_thompson'),
            ('Fatima Al-Zahra', 'ADVANCED', ['FUTSAL'], 'fatima.alzahra@arenax.com', 'fatima_alzahra'),
            ('Kevin Wong', 'INTERMEDIATE', ['FUTSAL'], 'kevin.wong@arenax.com', 'kevin_wong'),
            ('Natasha Volkov', 'PROFESSIONAL', ['BADMINTON'], 'natasha.volkov@arenax.com', 'natasha_volkov'),
            ('Diego Fernandez', 'BEGINNER', ['FUTSAL'], 'diego.fernandez@arenax.com', 'diego_fernandez'),
            ('Yuki Tanaka', 'ADVANCED', ['BADMINTON'], 'yuki.tanaka@arenax.com', 'yuki_tanaka'),
            ('Marcus Williams', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON'], 'marcus.williams@arenax.com', 'marcus_williams'),
            ('Camila Rossi', 'PROFESSIONAL', ['FUTSAL'], 'camila.rossi@arenax.com', 'camila_rossi'),
            ('Raj Sharma', 'ADVANCED', ['BADMINTON'], 'raj.sharma@arenax.com', 'raj_sharma'),
            ('Olivia Taylor', 'INTERMEDIATE', ['FUTSAL'], 'olivia.taylor@arenax.com', 'olivia_taylor'),
            ('Hassan Ali', 'BEGINNER', ['BADMINTON'], 'hassan.ali@arenax.com', 'hassan_ali'),
            ('Emma Wilson', 'ADVANCED', ['FUTSAL', 'BADMINTON'], 'emma.wilson@arenax.com', 'emma_wilson'),
            ('Liam O\'Connor', 'PROFESSIONAL', ['FUTSAL'], 'liam.oconnor@arenax.com', 'liam_oconnor'),
            ('Zara Khan', 'INTERMEDIATE', ['BADMINTON'], 'zara.khan@arenax.com', 'zara_khan'),
            ('Noah Anderson', 'ADVANCED', ['FUTSAL'], 'noah.anderson@arenax.com', 'noah_anderson'),
            ('Aria Johansson', 'BEGINNER', ['BADMINTON'], 'aria.johansson@arenax.com', 'aria_johansson'),
            ('Gabriel Silva', 'INTERMEDIATE', ['FUTSAL'], 'gabriel.silva@arenax.com', 'gabriel_silva'),
            ('Mia Zhang', 'PROFESSIONAL', ['BADMINTON'], 'mia.zhang@arenax.com', 'mia_zhang'),
            ('Ethan Davis', 'ADVANCED', ['FUTSAL', 'BADMINTON'], 'ethan.davis@arenax.com', 'ethan_davis'),
            ('Layla Ibrahim', 'INTERMEDIATE', ['FUTSAL'], 'layla.ibrahim@arenax.com', 'layla_ibrahim'),
            ('Ryan Murphy', 'BEGINNER', ['BADMINTON'], 'ryan.murphy@arenax.com', 'ryan_murphy'),
            ('Chloe Martin', 'ADVANCED', ['FUTSAL'], 'chloe.martin@arenax.com', 'chloe_martin'),
            ('Alexander Petrov', 'PROFESSIONAL', ['BADMINTON'], 'alexander.petrov@arenax.com', 'alexander_petrov'),
            ('Amara Okafor', 'INTERMEDIATE', ['FUTSAL'], 'amara.okafor@arenax.com', 'amara_okafor'),
            ('Benjamin Lee', 'ADVANCED', ['BADMINTON'], 'benjamin.lee@arenax.com', 'benjamin_lee'),
            ('Sophia Gonzalez', 'BEGINNER', ['FUTSAL'], 'sophia.gonzalez@arenax.com', 'sophia_gonzalez'),
            ('Daniel Park', 'INTERMEDIATE', ['FUTSAL', 'BADMINTON'], 'daniel.park@arenax.com', 'daniel_park'),
            ('Ava Mitchell', 'PROFESSIONAL', ['BADMINTON'], 'ava.mitchell@arenax.com', 'ava_mitchell'),
            ('Omar Rashid', 'ADVANCED', ['FUTSAL'], 'omar.rashid@arenax.com', 'omar_rashid'),
            ('Grace Liu', 'INTERMEDIATE', ['BADMINTON'], 'grace.liu@arenax.com', 'grace_liu'),
            ('Samuel Torres', 'BEGINNER', ['FUTSAL'], 'samuel.torres@arenax.com', 'samuel_torres'),
            ('Maya Patel', 'ADVANCED', ['BADMINTON'], 'maya.patel@arenax.com', 'maya_patel'),
            ('Jackson Smith', 'PROFESSIONAL', ['FUTSAL'], 'jackson.smith@arenax.com', 'jackson_smith'),
            ('Leila Nazari', 'INTERMEDIATE', ['FUTSAL'], 'leila.nazari@arenax.com', 'leila_nazari'),
            ('Tyler Johnson', 'ADVANCED', ['BADMINTON'], 'tyler.johnson@arenax.com', 'tyler_johnson'),
            ('Nora Andersson', 'BEGINNER', ['FUTSAL'], 'nora.andersson@arenax.com', 'nora_andersson'),
            ('Kai Nakamura', 'INTERMEDIATE', ['BADMINTON'], 'kai.nakamura@arenax.com', 'kai_nakamura'),
            ('Luna Rodriguez', 'PROFESSIONAL', ['FUTSAL', 'BADMINTON'], 'luna.rodriguez@arenax.com', 'luna_rodriguez'),
            ('Caleb Wright', 'ADVANCED', ['FUTSAL'], 'caleb.wright@arenax.com', 'caleb_wright'),
        ]

        locations = [
            'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
            'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
            'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
            'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
            'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
            'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD'
        ]

        for i, (full_name, skill_level, sports, email, username) in enumerate(player_names):
            phone_number = f'+123456{7900 + i:04d}'
            location = random.choice(locations)
            
            # Generate realistic bio based on skill level and sports
            sport_names = {'FUTSAL': 'futsal', 'BADMINTON': 'badminton'}
            sport_list = [sport_names[sport] for sport in sports]
            sport_text = ' and '.join(sport_list)
            
            if skill_level == 'BEGINNER':
                bio = f"New to {sport_text}, eager to learn and improve. Looking for friendly matches and training partners."
            elif skill_level == 'INTERMEDIATE':
                bio = f"Experienced {sport_text} player with 3-5 years of playing time. Enjoy competitive matches and team play."
            elif skill_level == 'ADVANCED':
                bio = f"Skilled {sport_text} player with tournament experience. Always looking for challenging matches and team opportunities."
            else:  # PROFESSIONAL
                bio = f"Professional {sport_text} player with extensive competition experience. Available for high-level tournaments and coaching."
            
            user, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'full_name': full_name,
                    'phone_number': phone_number,
                    'role': 'PLAYER',
                    'is_verified': True,
                    'skill_level': skill_level,
                    'preferred_sports': sports,
                    'bio': bio,
                    'location': location,
                    'country': 'United States',
                    'gender': random.choice(['MALE', 'FEMALE']),
                    'is_available_for_matches': random.choice([True, True, True, False]),  # 75% available
                    'matches_played': random.randint(0, 100) if skill_level != 'BEGINNER' else random.randint(0, 10),
                    'password': make_password('player123'),
                }
            )
            
            # Calculate win rate and matches won
            if user.matches_played > 0:
                if skill_level == 'PROFESSIONAL':
                    win_rate = random.uniform(0.7, 0.9)
                elif skill_level == 'ADVANCED':
                    win_rate = random.uniform(0.6, 0.8)
                elif skill_level == 'INTERMEDIATE':
                    win_rate = random.uniform(0.4, 0.7)
                else:  # BEGINNER
                    win_rate = random.uniform(0.2, 0.5)
                
                user.matches_won = int(user.matches_played * win_rate)
                user.win_rate = win_rate
                user.save()
            
            users[f'player_{username}'] = user

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
                    
                    # Skip some days randomly to make it realistic
                    if random.random() < 0.2:  # 20% chance to skip a day
                        continue
                    
                    # Create availability with different operating hours
                    if random.random() < 0.8:  # 80% chance for normal hours
                        VenueAvailability.objects.get_or_create(
                            venue=venue,
                            date=future_date,
                            defaults={
                                'opening_time': time(8, 0),
                                'closing_time': time(22, 0),
                                'is_available': True,
                                'notes': 'Normal operating hours'
                            }
                        )
                    else:  # 20% chance for extended hours
                        VenueAvailability.objects.get_or_create(
                            venue=venue,
                            date=future_date,
                            defaults={
                                'opening_time': time(6, 0),
                                'closing_time': time(23, 0),
                                'is_available': True,
                                'notes': 'Extended hours for special events'
                            }
                        )

        return venues

    def create_teams(self, users):
        """Create teams with members"""
        teams = []
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        # Team data with realistic names and compositions
        team_data = [
            {
                'name': 'Thunder Strikers',
                'sport_types': ['FUTSAL'],
                'owner_username': 'carlos_silva',
                'member_count': 12
            },
            {
                'name': 'Lightning Bolts',
                'sport_types': ['BADMINTON'],
                'owner_username': 'maria_garcia',
                'member_count': 8
            },
            {
                'name': 'Phoenix Warriors',
                'sport_types': ['FUTSAL', 'BADMINTON'],
                'owner_username': 'james_brown',
                'member_count': 15
            },
            {
                'name': 'Elite Eagles',
                'sport_types': ['FUTSAL'],
                'owner_username': 'roberto_martinez',
                'member_count': 10
            },
            {
                'name': 'Badminton Aces',
                'sport_types': ['BADMINTON'],
                'owner_username': 'sophie_chen',
                'member_count': 6
            },
            {
                'name': 'Futsal Masters',
                'sport_types': ['FUTSAL'],
                'owner_username': 'michael_johnson',
                'member_count': 14
            },
            {
                'name': 'Smash Champions',
                'sport_types': ['BADMINTON'],
                'owner_username': 'elena_rodriguez',
                'member_count': 9
            },
            {
                'name': 'All-Star United',
                'sport_types': ['FUTSAL', 'BADMINTON'],
                'owner_username': 'david_kim',
                'member_count': 13
            },
            {
                'name': 'Rookie Rockets',
                'sport_types': ['FUTSAL'],
                'owner_username': 'isabella_santos',
                'member_count': 7
            },
            {
                'name': 'Victory Vipers',
                'sport_types': ['BADMINTON'],
                'owner_username': 'lucas_thompson',
                'member_count': 11
            },
            {
                'name': 'Dream Team FC',
                'sport_types': ['FUTSAL'],
                'owner_username': 'ahmed_hassan',
                'member_count': 12
            },
            {
                'name': 'Shuttle Stars',
                'sport_types': ['BADMINTON'],
                'owner_username': 'priya_patel',
                'member_count': 8
            },
            {
                'name': 'Golden Gladiators',
                'sport_types': ['FUTSAL', 'BADMINTON'],
                'owner_username': 'fatima_alzahra',
                'member_count': 15
            },
            {
                'name': 'Rising Titans',
                'sport_types': ['FUTSAL'],
                'owner_username': 'kevin_wong',
                'member_count': 9
            },
            {
                'name': 'Court Kings',
                'sport_types': ['BADMINTON'],
                'owner_username': 'natasha_volkov',
                'member_count': 10
            }
        ]
        
        for team_info in team_data:
            owner_key = f'player_{team_info["owner_username"]}'
            if owner_key not in users:
                continue
                
            owner = users[owner_key]
            
            team, created = Team.objects.get_or_create(
                name=team_info['name'],
                defaults={
                    'owner': owner,
                    'sport_types': team_info['sport_types'],
                    'max_size': 15,
                    'is_active': True
                }
            )
            teams.append(team)
            
            if created:
                # Create owner membership
                TeamMembership.objects.create(
                    team=team,
                    player=owner,
                    role='OWNER',
                    is_active=True
                )
                
                # Add activity history for team creation
                ActivityHistory.objects.create(
                    team=team,
                    event_type='TEAM_CREATED',
                    description=f'Team {team.name} was created',
                    performed_by=owner
                )
                
                # Add random members to the team
                available_players = [p for p in players if p != owner and 
                                   any(sport in p.preferred_sports for sport in team_info['sport_types'])]
                
                if available_players:
                    num_members = min(team_info['member_count'] - 1, len(available_players))  # -1 for owner
                    selected_members = random.sample(available_players, num_members)
                    
                    for i, member in enumerate(selected_members):
                        # Assign some members as leaders
                        role = 'LEADER' if i < 2 and random.random() < 0.3 else 'MEMBER'
                        
                        membership = TeamMembership.objects.create(
                            team=team,
                            player=member,
                            role=role,
                            is_active=True
                        )
                        
                        # Add activity history
                        ActivityHistory.objects.create(
                            team=team,
                            event_type='MEMBER_ADDED',
                            description=f'{member.full_name} joined the team as {role}',
                            performed_by=owner
                        )
                
                # Create some invitations (both pending and responded)
                remaining_players = [p for p in available_players if not team.memberships.filter(player=p).exists()]
                if remaining_players and len(remaining_players) > 0:
                    num_invitations = min(3, len(remaining_players))
                    invited_players = random.sample(remaining_players, num_invitations)
                    
                    for invited_player in invited_players:
                        status = random.choice(['PENDING', 'ACCEPTED', 'DECLINED'])
                        invitation = Invitation.objects.create(
                            team=team,
                            player=invited_player,
                            sender=owner,
                            status=status,
                            expires_at=timezone.now() + timedelta(days=7)
                        )
                        
                        if status in ['ACCEPTED', 'DECLINED']:
                            invitation.responded_at = timezone.now() - timedelta(days=random.randint(1, 5))
                            invitation.save()
                            
                            # Add activity history
                            ActivityHistory.objects.create(
                                team=team,
                                event_type=f'INVITATION_{status}',
                                description=f'{invited_player.full_name} {status.lower()} invitation to join the team',
                                performed_by=invited_player
                            )
        
        return teams

    def create_tournaments(self, users, venues):
        """Create tournaments (both individual and team-based)"""
        tournaments = []
        
        tournament_data = [
            # Individual tournaments
            {
                'title': 'Spring Futsal Championship 2024',
                'description': 'Annual spring futsal tournament featuring players from across the region.',
                'sport_type': 'FUTSAL',
                'registration_type': 'INDIVIDUAL',
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
                'registration_type': 'INDIVIDUAL',
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
                'registration_type': 'INDIVIDUAL',
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
                'registration_type': 'INDIVIDUAL',
                'date': date.today() + timedelta(days=30),
                'start_time': time(11, 0),
                'end_time': time(16, 0),
                'entry_fee': 20.00,
                'max_participants': 24,
                'organizer_key': 'organizer_emma_organizer',
                'venue_index': 3,
                'status': 'UPCOMING'
            },
            # Team-based tournaments
            {
                'title': 'Elite Futsal Team Championship',
                'description': 'Premier team-based futsal tournament for organized teams.',
                'sport_type': 'FUTSAL',
                'registration_type': 'TEAM',
                'team_size': 5,
                'allow_substitutes': True,
                'max_substitutes': 10,
                'date': date.today() + timedelta(days=25),
                'start_time': time(9, 0),
                'end_time': time(19, 0),
                'entry_fee': 200.00,
                'max_participants': 8,  # 8 teams
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 0,
                'status': 'UPCOMING'
            },
            {
                'title': 'Badminton Doubles Team Tournament',
                'description': 'Team tournament featuring badminton doubles matches.',
                'sport_type': 'BADMINTON',
                'registration_type': 'TEAM',
                'team_size': 2,
                'allow_substitutes': False,
                'max_substitutes': 0,
                'date': date.today() + timedelta(days=18),
                'start_time': time(10, 0),
                'end_time': time(16, 0),
                'entry_fee': 80.00,
                'max_participants': 12,  # 12 teams
                'organizer_key': 'organizer_emma_organizer',
                'venue_index': 1,
                'status': 'UPCOMING'
            },
            {
                'title': 'Mixed Sports Team Challenge',
                'description': 'Multi-sport team tournament featuring both futsal and badminton.',
                'sport_type': 'FUTSAL',  # Primary sport
                'registration_type': 'TEAM',
                'team_size': 8,
                'allow_substitutes': True,
                'max_substitutes': 7,
                'date': date.today() + timedelta(days=35),
                'start_time': time(8, 0),
                'end_time': time(20, 0),
                'entry_fee': 300.00,
                'max_participants': 6,  # 6 teams
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 2,
                'status': 'UPCOMING'
            },
            {
                'title': 'Corporate Futsal League',
                'description': 'Team tournament for corporate and organizational teams.',
                'sport_type': 'FUTSAL',
                'registration_type': 'TEAM',
                'team_size': 5,
                'allow_substitutes': True,
                'max_substitutes': 8,
                'date': date.today() + timedelta(days=12),
                'start_time': time(18, 0),
                'end_time': time(22, 0),
                'entry_fee': 150.00,
                'max_participants': 10,  # 10 teams
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 3,
                'status': 'UPCOMING'
            },
            # Some completed tournaments for history
            {
                'title': 'Winter Futsal Championship 2023',
                'description': 'Completed winter tournament with great participation.',
                'sport_type': 'FUTSAL',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() - timedelta(days=45),
                'start_time': time(10, 0),
                'end_time': time(18, 0),
                'entry_fee': 45.00,
                'max_participants': 20,
                'organizer_key': 'organizer_alex_organizer',
                'venue_index': 0,
                'status': 'COMPLETED'
            },
            {
                'title': 'Autumn Badminton Open 2023',
                'description': 'Successful autumn badminton tournament.',
                'sport_type': 'BADMINTON',
                'registration_type': 'INDIVIDUAL',
                'date': date.today() - timedelta(days=60),
                'start_time': time(9, 0),
                'end_time': time(17, 0),
                'entry_fee': 30.00,
                'max_participants': 28,
                'organizer_key': 'organizer_emma_organizer',
                'venue_index': 1,
                'status': 'COMPLETED'
            }
        ]

        for tournament_info in tournament_data:
            venue = venues[tournament_info['venue_index']]
            
            # Calculate registration deadline
            days_until_tournament = (tournament_info['date'] - date.today()).days
            deadline_days = max(1, days_until_tournament - 2)  # At least 1 day before, preferably 2
            
            tournament, created = Tournament.objects.get_or_create(
                title=tournament_info['title'],
                defaults={
                    'organizer': users[tournament_info['organizer_key']],
                    'description': tournament_info['description'],
                    'sport_type': tournament_info['sport_type'],
                    'registration_type': tournament_info['registration_type'],
                    'team_size': tournament_info.get('team_size', 1),
                    'allow_substitutes': tournament_info.get('allow_substitutes', False),
                    'max_substitutes': tournament_info.get('max_substitutes', 0),
                    'date': tournament_info['date'],
                    'start_time': tournament_info['start_time'],
                    'end_time': tournament_info['end_time'],
                    'venue': venue.name,
                    'venue_address': venue.location,
                    'linked_venue': venue,
                    'entry_fee': Decimal(str(tournament_info['entry_fee'])),
                    'max_participants': tournament_info['max_participants'],
                    'min_participants': 4 if tournament_info['registration_type'] == 'INDIVIDUAL' else 2,
                    'registration_deadline': timezone.now() + timedelta(days=deadline_days),
                    'status': tournament_info['status'],
                    'prize_pool': Decimal(str(tournament_info['entry_fee'] * tournament_info['max_participants'] * 0.8)),
                    'rules': f"Standard {tournament_info['sport_type'].lower()} rules apply. {'Team-based registration required.' if tournament_info['registration_type'] == 'TEAM' else 'Individual registration.'}",
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
                
                # Create one availability slot per day to avoid unique constraint issues
                if random.random() < 0.7:  # 70% chance for availability
                    # Randomly choose between morning, afternoon, or all-day availability
                    availability_type = random.choice(['morning', 'afternoon', 'all_day'])
                    
                    if availability_type == 'morning':
                        start_time, end_time = time(8, 0), time(14, 0)
                        notes = 'Available for morning tournaments'
                    elif availability_type == 'afternoon':
                        start_time, end_time = time(14, 0), time(22, 0)
                        notes = 'Available for afternoon/evening tournaments'
                    else:  # all_day
                        start_time, end_time = None, None
                        notes = 'Available all day'
                    
                    RefereeAvailability.objects.get_or_create(
                        referee=referee,
                        available_date=future_date,
                        start_time=start_time,
                        end_time=end_time,
                        defaults={
                            'is_available': True,
                            'notes': notes
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
                            'scheduled_time': timezone.make_aware(datetime.combine(tournament.date, tournament.start_time))
                        }
                    )
                    
                    # Create referee booking
                    booking, created = RefereeBooking.objects.get_or_create(
                        referee=selected_referee,
                        match=match,
                        tournament=tournament,
                        defaults={
                            'requested_by': tournament.organizer,
                            'match_date': timezone.make_aware(datetime.combine(tournament.date, tournament.start_time)),
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
                        'scheduled_time': timezone.make_aware(datetime.combine(past_tournament['date'], time(10, 0)))
                    }
                )
                
                # Create completed booking
                booking, created = RefereeBooking.objects.get_or_create(
                    referee=john_referee,
                    match=match,
                    tournament=tournament,
                    defaults={
                        'requested_by': past_tournament['organizer'],
                        'match_date': timezone.make_aware(datetime.combine(past_tournament['date'], time(10, 0))),
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
        for i in range(15):
            venue = random.choice(venues)
            user = random.choice(organizers + players)
            
            # Find an available date with venue availability
            attempts = 0
            booking_created = False
            
            while attempts < 10 and not booking_created:  # Try up to 10 times
                future_date = date.today() + timedelta(days=random.randint(1, 20))
                
                # Check if venue has availability for this date
                availability = VenueAvailability.objects.filter(
                    venue=venue,
                    date=future_date,
                    is_available=True
                ).first()
                
                if availability:
                    # Create booking within the available hours
                    start_hour = random.randint(availability.opening_time.hour, max(availability.opening_time.hour, availability.closing_time.hour - 2))
                    duration = random.randint(1, min(3, availability.closing_time.hour - start_hour))  # 1-3 hours or less
                    
                    start_time = time(start_hour, 0)
                    end_time = time(start_hour + duration, 0)
                    
                    try:
                        booking, created = VenueBooking.objects.get_or_create(
                            venue=venue,
                            user=user,
                            date=future_date,
                            start_time=start_time,
                            end_time=end_time,
                            defaults={
                                'purpose': random.choice([
                                    'Training session',
                                    'Private match',
                                    'Team practice',
                                    'Tournament preparation',
                                    'Corporate event',
                                    'Birthday party tournament'
                                ]),
                                'status': random.choice(['PENDING', 'CONFIRMED', 'CONFIRMED']),  # More confirmed bookings
                                'payment_status': random.choice(['PENDING', 'COMPLETED']),
                                'notes': f'Booking by {user.full_name} for {random.choice(["team training", "match practice", "tournament prep"])}'
                            }
                        )
                        if created:
                            booking_created = True
                    except Exception as e:
                        # If booking fails due to validation, try another date
                        attempts += 1
                        continue
                
                attempts += 1

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

    def create_team_tournament_registrations(self, teams, tournaments):
        """Create team tournament registrations"""
        team_tournaments = [t for t in tournaments if t.registration_type == 'TEAM']
        
        for tournament in team_tournaments:
            # Register some teams for each team tournament
            eligible_teams = []
            
            for team in teams:
                # Check if team supports the tournament sport
                if tournament.sport_type in team.sport_types:
                    # Check if team has enough members
                    if team.member_count >= tournament.team_size:
                        eligible_teams.append(team)
            
            if eligible_teams:
                num_registrations = min(random.randint(2, 6), len(eligible_teams), tournament.max_participants)
                selected_teams = random.sample(eligible_teams, num_registrations)
                
                for team in selected_teams:
                    # Find a team member who can register (owner or leader)
                    registrar = team.memberships.filter(
                        role__in=['OWNER', 'LEADER'],
                        is_active=True
                    ).first()
                    
                    if registrar:
                        registration, created = TeamTournamentRegistration.objects.get_or_create(
                            tournament=tournament,
                            team=team,
                            defaults={
                                'registered_by': registrar.player,
                                'status': random.choice(['PENDING', 'CONFIRMED']),
                            }
                        )
                        
                        if created:
                            # Select players for the tournament
                            team_members = list(team.memberships.filter(is_active=True))
                            
                            # Always include the registrar
                            selected_members = [registrar.player]
                            
                            # Add more members up to the required team size + some substitutes
                            remaining_members = [m.player for m in team_members if m.player != registrar.player]
                            
                            max_additional = tournament.team_size - 1  # -1 for registrar
                            if tournament.allow_substitutes:
                                max_additional += min(tournament.max_substitutes, 3)  # Limit substitutes for realism
                            
                            if remaining_members:
                                additional_count = min(max_additional, len(remaining_members))
                                selected_members.extend(random.sample(remaining_members, additional_count))
                            
                            # Add selected players to the registration
                            registration.selected_players.set(selected_members)
                            
                            # Add activity history
                            ActivityHistory.objects.create(
                                team=team,
                                event_type='TOURNAMENT_REGISTERED',
                                description=f'Team registered for {tournament.title}',
                                performed_by=registrar.player,
                                metadata={
                                    'tournament_id': str(tournament.id),
                                    'selected_players_count': len(selected_members)
                                }
                            )

    def create_player_connections(self, users):
        """Create player connection requests and notifications"""
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        # Create some connection requests
        for i in range(20):
            from_player = random.choice(players)
            to_player = random.choice([p for p in players if p != from_player])
            
            # Avoid duplicate requests
            if not PlayerJoinRequest.objects.filter(from_player=from_player, to_player=to_player).exists():
                status = random.choice(['pending', 'accepted', 'declined'])
                PlayerJoinRequest.objects.create(
                    from_player=from_player,
                    to_player=to_player,
                    status=status
                )
                
                # Create notification for the request
                if status == 'pending':
                    Notification.objects.create(
                        user=to_player,
                        notification_type='GENERAL',
                        title='New Connection Request',
                        message=f'{from_player.full_name} wants to connect with you',
                        read=False
                    )
                elif status == 'accepted':
                    Notification.objects.create(
                        user=from_player,
                        notification_type='GENERAL',
                        title='Connection Request Accepted',
                        message=f'{to_player.full_name} accepted your connection request',
                        read=random.choice([True, False])
                    )
        
        # Create general notifications for players
        notification_types = [
            ('TOURNAMENT_UPDATED', 'Tournament Update', 'The Spring Championship has been updated with new details'),
            ('MATCH_SCHEDULED', 'Match Scheduled', 'Your upcoming match has been scheduled for next week'),
            ('BOOKING_CONFIRMED', 'Booking Confirmed', 'Your venue booking has been confirmed'),
            ('GENERAL', 'Welcome to ArenaX', 'Welcome to the ArenaX platform! Start exploring tournaments and connecting with players.'),
            ('GENERAL', 'New Tournament Available', 'A new badminton tournament is now open for registration'),
            ('GENERAL', 'Team Invitation', 'You have been invited to join a team'),
        ]
        
        for player in players[:30]:  # Create notifications for first 30 players
            num_notifications = random.randint(1, 5)
            for _ in range(num_notifications):
                notif_type, title, message = random.choice(notification_types)
                Notification.objects.create(
                    user=player,
                    notification_type=notif_type,
                    title=title,
                    message=message,
                    read=random.choice([True, False]),
                    created_at=timezone.now() - timedelta(days=random.randint(0, 30))
                )

    def create_chat_messages(self, users):
        """Create chat messages between users"""
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        # Create private messages between players
        for i in range(50):
            sender = random.choice(players)
            receiver = random.choice([p for p in players if p != sender])
            
            messages = [
                "Hey! Want to play a match this weekend?",
                "Great game yesterday! Thanks for the match.",
                "Are you available for practice tomorrow?",
                "I saw you're looking for team members. Interested in joining?",
                "Good luck in the tournament!",
                "Let's schedule a training session soon.",
                "Thanks for the game tips, really helpful!",
                "Are you participating in the upcoming championship?",
                "Want to form a team for the next tournament?",
                "Great playing with you today!"
            ]
            
            Message.objects.create(
                sender=sender,
                receiver=receiver,
                content=random.choice(messages),
                read=random.choice([True, False]),
                timestamp=timezone.now() - timedelta(days=random.randint(0, 15))
            )
        
        # Create global chat messages
        global_messages = [
            "Looking for badminton partners in the NYC area!",
            "Great tournament last weekend, thanks to all organizers!",
            "Anyone interested in forming a futsal team?",
            "New to the platform, excited to start playing!",
            "Congratulations to all winners of the Spring Championship!",
            "Looking forward to the upcoming tournaments!",
            "Thanks for the warm welcome to the community!",
            "Any tips for improving my badminton serve?",
            "Great to see so many active players here!",
            "Who's excited for the team tournaments?"
        ]
        
        for i in range(30):
            sender = random.choice(players)
            ChatMessage.objects.create(
                sender=sender,
                content=random.choice(global_messages),
                timestamp=timezone.now() - timedelta(days=random.randint(0, 20))
            )

    def create_player_statistics(self, users):
        """Create player statistics for recent months"""
        players = [user for key, user in users.items() if key.startswith('player_')]
        
        # Create statistics for the last 6 months
        for player in players:
            if player.skill_level == 'BEGINNER':
                continue  # Skip beginners for monthly stats
            
            for month_offset in range(6):
                target_date = date.today() - timedelta(days=30 * month_offset)
                year = target_date.year
                month = target_date.month
                
                # Generate realistic statistics based on skill level
                if player.skill_level == 'PROFESSIONAL':
                    matches_played = random.randint(8, 15)
                    tournaments_participated = random.randint(2, 4)
                    win_rate = random.uniform(0.7, 0.9)
                elif player.skill_level == 'ADVANCED':
                    matches_played = random.randint(5, 12)
                    tournaments_participated = random.randint(1, 3)
                    win_rate = random.uniform(0.6, 0.8)
                else:  # INTERMEDIATE
                    matches_played = random.randint(2, 8)
                    tournaments_participated = random.randint(0, 2)
                    win_rate = random.uniform(0.4, 0.7)
                
                matches_won = int(matches_played * win_rate)
                tournaments_won = random.randint(0, min(1, tournaments_participated))
                
                PlayerStatistics.objects.get_or_create(
                    player=player,
                    year=year,
                    month=month,
                    defaults={
                        'matches_played': matches_played,
                        'matches_won': matches_won,
                        'tournaments_participated': tournaments_participated,
                        'tournaments_won': tournaments_won,
                    }
                )
        
        # Create upcoming matches for some players
        active_players = [p for p in players if p.is_available_for_matches]
        tournaments = Tournament.objects.filter(status='UPCOMING')
        
        for player in active_players[:20]:  # Create upcoming matches for 20 players
            if tournaments:
                tournament = random.choice(tournaments)
                opponent_names = [
                    "Alex Johnson", "Maria Santos", "David Chen", "Sarah Wilson",
                    "Mike Rodriguez", "Emma Thompson", "Carlos Garcia", "Lisa Park"
                ]
                
                UpcomingMatch.objects.get_or_create(
                    player=player,
                    tournament=tournament,
                    defaults={
                        'match_date': timezone.make_aware(datetime.combine(tournament.date, tournament.start_time)),
                        'opponent_name': random.choice(opponent_names),
                        'tournament_name': tournament.title,
                        'venue': tournament.venue_name,
                    }
                )