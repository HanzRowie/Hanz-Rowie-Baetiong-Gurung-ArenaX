#!/usr/bin/env python3
"""
Django management command to fix tournament types:
- Remove individual futsal tournaments (incorrect)
- Create proper team futsal tournament
- Create individual badminton tournament
- Register Carlos Silva appropriately for both
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta, date, time
from decimal import Decimal

from accounts.models import CustomUser
from tournaments.models import Tournament, TournamentRegistration
from teams.models import Team, TeamMembership, TeamTournamentRegistration
from venues.models import Venue


class Command(BaseCommand):
    help = 'Fix tournament types - remove individual futsal, create proper team futsal and individual badminton'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Fixing tournament types...'))
        
        # Get users
        try:
            alex = CustomUser.objects.get(email='alex.organizer@arenax.com')
            carlos = CustomUser.objects.get(email='carlos.silva@arenax.com')
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR('Required users not found. Run seed_ui_test_data first.'))
            return
        
        # Get venues
        venues = list(Venue.objects.all())
        if not venues:
            self.stdout.write(self.style.ERROR('No venues found. Run seed_ui_test_data first.'))
            return
        
        # Remove incorrect individual futsal tournaments
        individual_futsal = Tournament.objects.filter(
            sport_type='FUTSAL',
            registration_type='INDIVIDUAL'
        )
        
        count = individual_futsal.count()
        individual_futsal.delete()
        self.stdout.write(f'Removed {count} incorrect individual futsal tournaments')
        
        # Create proper team futsal tournament
        futsal_venue = next((v for v in venues if v.sport_type == 'FUTSAL'), venues[0])
        
        futsal_tournament = Tournament.objects.create(
            organizer=alex,
            title='ArenaX Futsal Team Championship',
            description='Professional 5v5 futsal tournament featuring the best teams in Los Angeles. Teams compete in a single-elimination format with FIFA futsal rules.',
            sport_type='FUTSAL',
            tournament_type='SINGLE_ELIMINATION',
            registration_type='TEAM',
            team_size=5,
            allow_substitutes=True,
            max_substitutes=10,
            date=date.today() + timedelta(days=21),  # 3 weeks from today
            start_time=time(9, 0),
            end_time=time(19, 0),
            venue=futsal_venue.name,
            venue_address=futsal_venue.location,
            linked_venue=futsal_venue,
            entry_fee=Decimal('150.00'),
            max_participants=8,  # 8 teams
            min_participants=4,
            registration_deadline=timezone.now() + timedelta(days=18),
            prize_pool=Decimal('4000.00'),
            rules='FIFA futsal rules apply. 20-minute halves with unlimited substitutions. Teams must have exactly 5 players on field with up to 10 substitutes.',
            status='UPCOMING'
        )
        
        # Create individual badminton tournament
        badminton_venue = next((v for v in venues if v.sport_type == 'BADMINTON'), venues[0])
        
        badminton_tournament = Tournament.objects.create(
            organizer=alex,
            title='ArenaX Badminton Singles Championship',
            description='Elite badminton singles tournament for individual players. Featuring professional courts and BWF-standard equipment.',
            sport_type='BADMINTON',
            tournament_type='SINGLE_ELIMINATION',
            registration_type='INDIVIDUAL',
            date=date.today() + timedelta(days=14),  # 2 weeks from today
            start_time=time(10, 0),
            end_time=time(18, 0),
            venue=badminton_venue.name,
            venue_address=badminton_venue.location,
            linked_venue=badminton_venue,
            entry_fee=Decimal('60.00'),
            max_participants=16,  # 16 individual players
            min_participants=8,
            registration_deadline=timezone.now() + timedelta(days=11),
            prize_pool=Decimal('2500.00'),
            rules='BWF rules apply. Best of 3 games to 21 points. Players must bring their own rackets.',
            status='UPCOMING'
        )
        
        # Register Carlos Silva's team for futsal tournament
        carlos_team = Team.objects.filter(
            owner=carlos
        ).first()
        
        # Check if team supports futsal
        if carlos_team and 'FUTSAL' in carlos_team.sport_types:
            # Get team members for player selection
            team_members = TeamMembership.objects.filter(
                team=carlos_team,
                is_active=True
            )[:5]  # Get 5 players for futsal
            
            if len(team_members) >= 5:
                team_registration = TeamTournamentRegistration.objects.create(
                    tournament=futsal_tournament,
                    team=carlos_team,
                    registered_by=carlos,
                    status='PENDING'  # Organizer needs to accept
                )
                
                # Select 5 players for the tournament
                selected_players = [membership.player for membership in team_members]
                team_registration.selected_players.set(selected_players)
                
                self.stdout.write(f'Registered {carlos_team.name} for futsal tournament (PENDING approval)')
            else:
                self.stdout.write(self.style.WARNING(f'Carlos team has only {len(team_members)} members, needs 5 for futsal'))
        else:
            self.stdout.write(self.style.WARNING('Carlos Silva team not found'))
        
        # Register Carlos Silva individually for badminton tournament
        TournamentRegistration.objects.create(
            tournament=badminton_tournament,
            player=carlos,
            status='PENDING'  # Organizer needs to accept
        )
        
        # Register some other players for both tournaments to make them interesting
        self.register_additional_participants(futsal_tournament, badminton_tournament)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully fixed tournament types:\n'
                f'✓ Removed incorrect individual futsal tournaments\n'
                f'✓ Created: {futsal_tournament.title} (TEAM)\n'
                f'✓ Created: {badminton_tournament.title} (INDIVIDUAL)\n'
                f'✓ Registered Carlos Silva team for futsal (PENDING)\n'
                f'✓ Registered Carlos Silva individually for badminton (PENDING)\n'
                f'✓ Added other participants for realistic tournaments\n\n'
                f'Next steps:\n'
                f'1. Login as alex.organizer@arenax.com\n'
                f'2. Accept tournament registrations\n'
                f'3. Generate brackets when ready\n'
                f'4. Test the complete tournament flow'
            )
        )

    def register_additional_participants(self, futsal_tournament, badminton_tournament):
        """Register additional participants to make tournaments realistic"""
        
        # Register other teams for futsal tournament
        all_teams = Team.objects.exclude(owner__email='carlos.silva@arenax.com')
        futsal_teams = [team for team in all_teams if 'FUTSAL' in team.sport_types][:3]
        
        for team in futsal_teams:
            team_members = TeamMembership.objects.filter(
                team=team,
                is_active=True
            )[:5]
            
            if len(team_members) >= 5:
                team_registration = TeamTournamentRegistration.objects.create(
                    tournament=futsal_tournament,
                    team=team,
                    registered_by=team.owner,
                    status='PENDING'
                )
                
                selected_players = [membership.player for membership in team_members]
                team_registration.selected_players.set(selected_players)
                
                self.stdout.write(f'  ✓ Registered {team.name} for futsal tournament')
        
        # Register individual players for badminton tournament
        all_players = CustomUser.objects.filter(
            role='PLAYER',
            is_active=True
        ).exclude(email='carlos.silva@arenax.com')
        
        badminton_players = [
            player for player in all_players 
            if player.preferred_sports and 'BADMINTON' in player.preferred_sports
        ][:7]  # Get 7 more players (total 8 with Carlos)
        
        for player in badminton_players:
            TournamentRegistration.objects.create(
                tournament=badminton_tournament,
                player=player,
                status='PENDING'
            )
            self.stdout.write(f'  ✓ Registered {player.full_name} for badminton tournament')