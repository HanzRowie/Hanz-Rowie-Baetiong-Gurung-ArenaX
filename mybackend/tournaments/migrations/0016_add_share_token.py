from django.db import migrations, models
import uuid


def generate_share_tokens(apps, schema_editor):
    Tournament = apps.get_model('tournaments', 'Tournament')
    for tournament in Tournament.objects.all():
        tournament.share_token = uuid.uuid4()
        tournament.save(update_fields=['share_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0015_add_match_remark_model'),
    ]

    operations = [
        # Step 1: Add field without unique constraint
        migrations.AddField(
            model_name='tournament',
            name='share_token',
            field=models.UUIDField(null=True, blank=True, editable=False),
        ),
        # Step 2: Populate unique tokens for all existing rows
        migrations.RunPython(generate_share_tokens, migrations.RunPython.noop),
        # Step 3: Now enforce uniqueness
        migrations.AlterField(
            model_name='tournament',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False, null=True, blank=True),
        ),
    ]
