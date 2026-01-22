# Generated manually to fix duplicate referee availabilities

from django.db import migrations
from django.db.models import Count


def remove_duplicate_availabilities(apps, schema_editor):
    """Remove duplicate referee availability entries, keeping the first one"""
    RefereeAvailability = apps.get_model('referees', 'RefereeAvailability')
    
    # Find all duplicate groups
    duplicates = RefereeAvailability.objects.values('referee', 'available_date').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    deleted_count = 0
    for duplicate in duplicates:
        # Get all entries for this referee/date combination
        entries = RefereeAvailability.objects.filter(
            referee=duplicate['referee'],
            available_date=duplicate['available_date']
        ).order_by('id')
        
        # Keep the first entry, delete the rest
        entries_to_delete = entries[1:]  # Skip the first one
        for entry in entries_to_delete:
            entry.delete()
            deleted_count += 1
    
    print(f"Removed {deleted_count} duplicate referee availability entries")


def reverse_remove_duplicates(apps, schema_editor):
    """This migration cannot be reversed as we're deleting data"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('referees', '0002_alter_refereeavailability_unique_together'),
    ]

    operations = [
        migrations.RunPython(
            remove_duplicate_availabilities,
            reverse_remove_duplicates,
        ),
    ]