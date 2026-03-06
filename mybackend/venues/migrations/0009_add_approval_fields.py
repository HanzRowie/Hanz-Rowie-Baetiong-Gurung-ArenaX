# Generated migration for venue approval workflow

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('venues', '0008_auto_20260126_0911'),
    ]

    operations = [
        migrations.AddField(
            model_name='venue',
            name='approval_status',
            field=models.CharField(
                max_length=25,
                choices=[
                    ('PENDING', 'Pending'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                    ('CONDITIONAL_APPROVAL', 'Conditional Approval'),
                ],
                default='PENDING',
                db_index=True,
                help_text='Current approval status of the venue'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='approval_date',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when the venue was approved or rejected'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='approved_by',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                to=settings.AUTH_USER_MODEL,
                related_name='approved_venues',
                help_text='Administrator who approved or rejected this venue'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='rejection_reason',
            field=models.TextField(
                blank=True,
                help_text='Explanation provided when venue is rejected'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='approval_notes',
            field=models.TextField(
                blank=True,
                help_text='Optional notes from admin during approval'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='verification_documents',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='JSON storage of document references with type and URL'
            ),
        ),
        migrations.AddField(
            model_name='venue',
            name='requested_documents',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='List of documents requested for conditional approval'
            ),
        ),
        # Add indexes for performance
        migrations.AddIndex(
            model_name='venue',
            index=models.Index(fields=['approval_status', 'id'], name='venues_approval_id_idx'),
        ),
        migrations.AddIndex(
            model_name='venue',
            index=models.Index(fields=['sport_type', 'approval_status'], name='venues_sport_approval_idx'),
        ),
        migrations.AddIndex(
            model_name='venue',
            index=models.Index(fields=['owner', 'approval_status'], name='venues_owner_approval_idx'),
        ),
    ]
