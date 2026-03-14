# Migration to fix coordinate field precision

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0012_add_venue_coordinates'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venue',
            name='latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=15,
                max_digits=20,
                null=True,
                help_text='Latitude coordinate of the venue location'
            ),
        ),
        migrations.AlterField(
            model_name='venue',
            name='longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=15,
                max_digits=20,
                null=True,
                help_text='Longitude coordinate of the venue location'
            ),
        ),
    ]
