# Generated migration for referee fee and payment tracking enhancements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('referees', '0007_add_sport_type_choices'),
    ]

    operations = [
        # Add fee fields to RefereeAvailability for per-session pricing
        migrations.AddField(
            model_name='refereeavailability',
            name='fee_per_match',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, help_text='Fee charged per match'),
        ),
        migrations.AddField(
            model_name='refereeavailability',
            name='fee_per_session',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, help_text='Fee charged per session/day'),
        ),
        
        # Add default fee to RefereeProfile
        migrations.AddField(
            model_name='refereeprofile',
            name='default_fee_per_match',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, help_text='Default fee per match'),
        ),
        migrations.AddField(
            model_name='refereeprofile',
            name='default_fee_per_session',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8, help_text='Default fee per session'),
        ),
    ]
