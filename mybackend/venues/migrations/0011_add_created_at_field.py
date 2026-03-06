# Generated migration to add created_at field to Venue model

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0010_venueauditlog_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='venue',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
