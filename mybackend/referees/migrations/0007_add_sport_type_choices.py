# Generated migration for adding sport type choices to referee profile

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('referees', '0006_make_match_nullable_unique_by_tournament'),
    ]

    operations = [
        migrations.AlterField(
            model_name='refereeprofile',
            name='sports_specialization',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='List of sports the referee is specialized in (e.g., ["FUTSAL", "BADMINTON"])'
            ),
        ),
    ]
