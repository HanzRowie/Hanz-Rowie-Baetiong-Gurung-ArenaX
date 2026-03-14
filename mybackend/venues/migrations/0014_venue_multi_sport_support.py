# Generated migration for multi-sport venue support

from django.db import migrations, models


def migrate_sport_type_to_list(apps, schema_editor):
    """Convert existing sport_type string to sport_types list"""
    Venue = apps.get_model('venues', 'Venue')
    for venue in Venue.objects.all():
        if hasattr(venue, 'sport_type') and venue.sport_type:
            venue.sport_types = [venue.sport_type]
            venue.save(update_fields=['sport_types'])


def reverse_sport_types_to_type(apps, schema_editor):
    """Convert sport_types list back to sport_type string"""
    Venue = apps.get_model('venues', 'Venue')
    for venue in Venue.objects.all():
        if venue.sport_types and len(venue.sport_types) > 0:
            venue.sport_type = venue.sport_types[0]
            venue.save(update_fields=['sport_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0013_alter_venue_coordinates_precision'),
    ]

    operations = [
        # Remove index that references sport_type
        migrations.RemoveIndex(
            model_name='venue',
            name='venues_venu_sport_t_250b2f_idx',
        ),
        # Add new sport_types field
        migrations.AddField(
            model_name='venue',
            name='sport_types',
            field=models.JSONField(default=list, help_text='List of supported sport types (e.g., ["FUTSAL", "BADMINTON"])'),
        ),
        # Migrate data from sport_type to sport_types
        migrations.RunPython(migrate_sport_type_to_list, reverse_sport_types_to_type),
        # Remove old sport_type field
        migrations.RemoveField(
            model_name='venue',
            name='sport_type',
        ),
    ]
