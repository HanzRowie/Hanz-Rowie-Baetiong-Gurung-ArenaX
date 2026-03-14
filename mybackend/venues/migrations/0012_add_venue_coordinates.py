# Generated migration to add latitude and longitude fields to Venue model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0011_add_created_at_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                help_text='Latitude coordinate of the venue location'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                help_text='Longitude coordinate of the venue location'
            ),
        ),
    ]
