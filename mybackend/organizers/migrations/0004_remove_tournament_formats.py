# Generated migration to remove unsupported tournament formats from organizers

from django.db import migrations, models

def update_tournament_template_types(apps, schema_editor):
    """Update all existing tournament templates to single elimination"""
    TournamentTemplate = apps.get_model('organizers', 'TournamentTemplate')
    
    # Update all tournament templates that are not single elimination to single elimination
    TournamentTemplate.objects.filter(
        tournament_type__in=['DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS']
    ).update(tournament_type='SINGLE_ELIMINATION')

def reverse_update_tournament_template_types(apps, schema_editor):
    """Reverse migration - no action needed as we can't restore original types"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('organizers', '0003_tournamenttemplate_tournamentanalytics'),
    ]

    operations = [
        migrations.RunPython(
            update_tournament_template_types,
            reverse_update_tournament_template_types,
        ),
        migrations.AlterField(
            model_name='tournamenttemplate',
            name='tournament_type',
            field=models.CharField(
                choices=[('SINGLE_ELIMINATION', 'Single Elimination')],
                max_length=20
            ),
        ),
    ]