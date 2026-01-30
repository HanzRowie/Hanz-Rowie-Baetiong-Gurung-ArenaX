# Generated migration to remove unsupported tournament formats

from django.db import migrations, models

def update_tournament_types(apps, schema_editor):
    """Update all existing tournaments to single elimination"""
    Tournament = apps.get_model('tournaments', 'Tournament')
    
    # Update all tournaments that are not single elimination to single elimination
    Tournament.objects.filter(
        tournament_type__in=['DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']
    ).update(tournament_type='SINGLE_ELIMINATION')

def reverse_update_tournament_types(apps, schema_editor):
    """Reverse migration - no action needed as we can't restore original types"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0005_match_team1_match_team2_match_winning_team_and_more'),
    ]

    operations = [
        migrations.RunPython(
            update_tournament_types,
            reverse_update_tournament_types,
        ),
        migrations.AlterField(
            model_name='tournament',
            name='tournament_type',
            field=models.CharField(
                choices=[('SINGLE_ELIMINATION', 'Single Elimination')],
                default='SINGLE_ELIMINATION',
                max_length=20
            ),
        ),
    ]