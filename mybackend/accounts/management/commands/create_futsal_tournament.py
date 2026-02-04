from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from accounts.models import CustomUser
from tournaments.models import Tournament
from teams.models import Team, TeamTournamentRegistration
from venues.models import Venue
import random

class Command(BaseCommand):
    help = 'Create a new futsal tournament with all available teams registered'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating new futsal tournament...'))

        try:
            # Get the organizer (Alex Rodriguez)
            organizer = CustomUser.objects.get(email='alex.organizer@arenax.com')
            self.stdout.write(f'Found organizer: {organizer.full_name}')

            # Get a futsal venue
            futsal_venue = Venue.objects.filter(sport_type='FUTSAL').first()
            if not futsal_venue:
                self.stdout.write(self.style.ERROR('No futsal venue found'))
                return

            # Create tournament date (2 weeks from now)
            tournament_date = timezone.now().date() + timedelta(days=14)
            registration_deadline = timezone.now() + timedelta(days=7)

            # Create the tournament
            tournament = Tournament.objects.create(
                organizer=organizer,
                title='ArenaX Futsal Championship 2026',
                description='Professional futsal tournament featuring the best teams in the region. Experience high-intensity 5v5 action with skilled players competing for the championship title.',
                sport_type='FUTSAL',
                tournament_type='SINGLE_ELIMINATION',
                registration_type='TEAM',
                team_size=5,
                allow_substitutes=True,
                max_substitutes=10,
                date=tournament_date,
                start_time=datetime.strptime('09:00', '%H:%M').time(),
                end_time=datetime.strptime('18:00', '%H:%M').time(),
                venue=futsal_venue.name,
                venue_address=futsal_venue.location,
                linked_venue=futsal_venue,
                entry_fee=200.00,
                max_participants=16,  # 16 teams
                min_participants=4,
                registration_deadline=registration_deadline,
                status='UPCOMING',
                prize_pool=8000.00,
                rules='''
Tournament Rules:
1. 5v5 format with unlimited substitutions
2. Each team can register up to 15 players (5 starters + 10 substitutes)
3. Matches are 40 minutes (20 minutes each half)
4. Single elimination format
5. FIFA futsal rules apply
6. All players must be registered before the tournament starts
7. Teams must arrive 30 minutes before their scheduled match
8. Professional referees will officiate all matches
                '''.strip()
            )

            self.stdout.write(f'Created tournament: {tournament.title}')

            # Get all available futsal teams
            all_teams = Team.objects.all()
            futsal_teams = [team for team in all_teams if 'FUTSAL' in (team.sport_types or [])]
            self.stdout.write(f'Found {len(futsal_teams)} futsal teams')

            # Register all teams for the tournament
            registered_count = 0
            for team in futsal_teams:
                # Get team members (limit to 15 players as per rules)
                team_members = list(team.memberships.filter(
                    is_active=True
                ).select_related('player')[:15])

                if len(team_members) >= 5:  # Minimum 5 players required
                    # Create team registration
                    registration = TeamTournamentRegistration.objects.create(
                        tournament=tournament,
                        team=team,
                        registered_by=team.owner,  # Team owner registers the team
                        status='PENDING'  # Set to PENDING so organizer can accept
                    )

                    # Add all team members as selected players
                    for membership in team_members:
                        registration.selected_players.add(membership.player)

                    registered_count += 1
                    self.stdout.write(f'Registered team: {team.name} ({len(team_members)} players)')

                else:
                    self.stdout.write(f'Skipped team {team.name} - insufficient players ({len(team_members)})')

            self.stdout.write(f'Successfully registered {registered_count} teams')

            # Create some additional teams if we don't have enough
            if registered_count < 8:
                self.stdout.write('Creating additional teams to reach minimum participants...')
                
                # Get available players who aren't in teams
                available_players = CustomUser.objects.filter(
                    role='PLAYER',
                    team_memberships__isnull=True
                ).exclude(email__in=[
                    'alex.organizer@arenax.com',
                    'carlos.silva@arenax.com'  # Carlos is already in a team
                ])

                # Create additional teams
                additional_teams_needed = max(0, 8 - registered_count)
                players_list = list(available_players)
                
                for i in range(additional_teams_needed):
                    if len(players_list) >= 5:  # Need at least 5 players per team
                        # Create new team
                        team_name = f'Tournament Team {i + 1}'
                        new_team = Team.objects.create(
                            name=team_name,
                            sport_types=['FUTSAL'],
                            max_size=15,
                            is_active=True,
                            owner=players_list[0]  # First player becomes owner
                        )

                        # Add players to the team (5-8 players per team)
                        team_size = min(8, len(players_list))
                        team_players = players_list[:team_size]
                        players_list = players_list[team_size:]  # Remove used players

                        for j, player in enumerate(team_players):
                            from teams.models import TeamMembership
                            TeamMembership.objects.create(
                                team=new_team,
                                player=player,
                                role='OWNER' if j == 0 else 'MEMBER',
                                is_active=True
                            )

                        # Register the new team
                        registration = TeamTournamentRegistration.objects.create(
                            tournament=tournament,
                            team=new_team,
                            registered_by=new_team.owner,
                            status='PENDING'
                        )

                        # Add all team members as selected players
                        for player in team_players:
                            registration.selected_players.add(player)

                        registered_count += 1
                        self.stdout.write(f'Created and registered team: {team_name} ({len(team_players)} players)')

            # Final summary
            total_registrations = TeamTournamentRegistration.objects.filter(tournament=tournament).count()
            
            self.stdout.write(self.style.SUCCESS(f'''
Tournament Created Successfully!
================================
Tournament: {tournament.title}
Date: {tournament.date}
Time: {tournament.start_time} - {tournament.end_time}
Venue: {tournament.venue}
Entry Fee: NPR {tournament.entry_fee}
Prize Pool: NPR {tournament.prize_pool}
Total Registered Teams: {total_registrations}
Status: {tournament.status}

Next Steps:
1. Login as alex.organizer@arenax.com
2. Go to Tournament Management
3. Accept team registrations
4. Generate tournament bracket
5. Start the tournament!

All teams are registered and ready for approval!
            '''))

        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR('Organizer alex.organizer@arenax.com not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating tournament: {str(e)}'))
            import traceback
            traceback.print_exc()