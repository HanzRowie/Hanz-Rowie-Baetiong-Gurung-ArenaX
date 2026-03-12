# Generated migration for role-specific document verification

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_add_tournament_venue_notification_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='business_document',
            field=models.FileField(
                blank=True,
                help_text='Business registration or license document for venue owners',
                max_length=500,
                null=True,
                upload_to='business_documents/%Y/%m/'
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='venue_images',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of venue image URLs (1-3 images required for venue owners)'
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='certification_document',
            field=models.FileField(
                blank=True,
                help_text='Certification document for organizers and referees',
                max_length=500,
                null=True,
                upload_to='certifications/%Y/%m/'
            ),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='verification_document',
            field=models.FileField(
                blank=True,
                help_text='Identity or business registration document (deprecated - use role-specific fields)',
                max_length=500,
                null=True,
                upload_to='verification_documents/%Y/%m/'
            ),
        ),
    ]
