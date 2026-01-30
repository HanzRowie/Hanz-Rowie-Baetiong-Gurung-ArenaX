from django.core.management.base import BaseCommand
from tournaments.models import Tournament, Match
from tournaments.views import generate_single_elimination_bracket
from accounts.models import CustomUser

class Command(BaseCommand):
    help = 'Regenerate tournament bracket for a specific tournament'

    def add_arguments(self, parser):
        parser.add_argument('tournament_id', type=str, help='Tournament ID to regenerate bracket for')
        parser.add_argument('--force', action='store_true', help='Force regeneration even if matches exist')

    def handle(self, *args, **options):
        tournament_id = options['tournament_id']
        force = options['force']

        try:
            tournament = Tournament.objects.get(id=tournament_id)
            self.stdout.write(f"Found tournament: {tournament.title}")

            # Check existing matches
            existing_matches = Match.objects.filter(tournament=tournament)
            if existing_matches.exists() and not force:
                self.stdout.write(
                    self.style.WARNING(
                        f"Tournament already has {existing_matches.count()} matches. Use --force to regenerate."
                    )
                )
                return

            if force and existing_matches.exists():
                self.stdout.write(f"Deleting {existing_matches.count()} existing matches...")
                existing_matches.delete()

            # Get participants
            if tournament.registration_type == 'INDIVIDUAL':
                from tournaments.models import TournamentRegistration
                accepted_registrations = TournamentRegistration.objects.filter(
                    tournament=tournament,
                    status='ACCEPTED'
                )
                participants = [reg.player for reg in accepted_registrations]
                participant_type = "players"
            else:  # TEAM
                from teams.models import TeamTournamentRegistration
                accepted_registrations = TeamTournamentRegistration.objects.filter(
                    tournament=tournament,
                    status='CONFIRMED'
                )
                participants = [reg.team for reg in accepted_registrations]
                participant_type = "teams"

            self.stdout.write(f"Found {len(participants)} {participant_type}")

            if len(participants) < tournament.min_participants:
                self.stdout.write(
                    self.style.ERROR(
                        f"Not enough participants. Need {tournament.min_participants}, have {len(participants)}"
                    )
                )
                return

            # Generate bracket
            if tournament.tournament_type == 'SINGLE_ELIMINATION':
                matches = generate_single_elimination_bracket(tournament, participants)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully generated {len(matches)} matches for single elimination bracket"
                    )
                )
                
                # Show bracket structure
                matches_by_round = {}
                for match in matches:
                    if match.round_number not in matches_by_round:
                        matches_by_round[match.round_number] = []
                    matches_by_round[match.round_number].append(match)
                
                for round_num in sorted(matches_by_round.keys()):
                    round_matches = matches_by_round[round_num]
                    self.stdout.write(f"Round {round_num}: {len(round_matches)} matches")
                    
                    for match in round_matches:
                        if tournament.registration_type == 'INDIVIDUAL':
                            p1 = match.player1.full_name if match.player1 else "TBD"
                            p2 = match.player2.full_name if match.player2 else "TBD"
                        else:
                            p1 = match.team1.name if match.team1 else "TBD"
                            p2 = match.team2.name if match.team2 else "TBD"
                        
                        self.stdout.write(f"  Match {match.match_number}: {p1} vs {p2}")

                # Update tournament status
                tournament.status = 'ONGOING'
                tournament.save()
                self.stdout.write(self.style.SUCCESS("Tournament status updated to ONGOING"))

            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"Bracket generation for {tournament.tournament_type} not implemented"
                    )
                )

        except Tournament.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Tournament with ID {tournament_id} not found")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error generating bracket: {str(e)}")
            )