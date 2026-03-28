from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0016_add_share_token'),
        ('venues', '0013_alter_venue_coordinates_precision'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='match_venue',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='hosted_matches',
                to='venues.venue',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='match_venue_name',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Custom venue name if not using a linked venue',
                max_length=200,
            ),
        ),
    ]
