from django.core.management.base import BaseCommand
from tournaments.models import Tournament

class Command(BaseCommand):
    help = 'Fix min_participants for tournaments that have enough participants but wrong minimum'

    def add_arguments(self, parser):
        parser.add_argument('--tournament-id', type=str, help='Specific tournament ID to fix')
        parser.add_argument('--min-participants', type=int, default=4, help='New minimum participants value')

    def handle(self, *args, **options):
        tournament_id = options.get('tournament_id')
        new_min_participants = options.get('min_participants')

        if tournament_id:
            # Fix specific tournament
            try:
                tournament = Tournament.objects.get(id=tournament_id)
                old_min = tournament.min_participants
                tournament.min_participants = new_min_participants
                tournament.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated tournament "{tournament.title}" min_participants from {old_min} to {new_min_participants}'
                    )
                )
            except Tournament.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Tournament with ID {tournament_id} not found')
                )
        else:
            # Fix all tournaments where registered_count >= min_participants but min_participants > registered_count
            tournaments = Tournament.objects.filter(
                status='UPCOMING',
                min_participants__gt=4  # Find tournaments with min_participants > 4
            )
            
            for tournament in tournaments:
                if tournament.registered_count >= 4 and tournament.registered_count < tournament.min_participants:
                    old_min = tournament.min_participants
                    tournament.min_participants = min(4, tournament.registered_count)
                    tournament.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Updated tournament "{tournament.title}" min_participants from {old_min} to {tournament.min_participants}'
                        )
                    )

            self.stdout.write(
                self.style.SUCCESS('Finished fixing tournament minimum participants')
            )