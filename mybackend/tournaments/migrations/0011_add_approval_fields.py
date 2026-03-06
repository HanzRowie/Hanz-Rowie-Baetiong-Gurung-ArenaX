# Generated migration for tournament approval workflow

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tournaments', '0010_tournamentregistration_payment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
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
                help_text='Current approval status of the tournament'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='approval_date',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when the tournament was approved or rejected'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='approved_by',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                to=settings.AUTH_USER_MODEL,
                related_name='approved_tournaments',
                help_text='Administrator who approved or rejected this tournament'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='rejection_reason',
            field=models.TextField(
                blank=True,
                help_text='Explanation provided when tournament is rejected'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='approval_notes',
            field=models.TextField(
                blank=True,
                help_text='Optional notes from admin during approval'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='verification_documents',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='JSON storage of document references with type and URL'
            ),
        ),
        migrations.AddField(
            model_name='tournament',
            name='requested_documents',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='List of documents requested for conditional approval'
            ),
        ),
        # Add indexes for performance
        migrations.AddIndex(
            model_name='tournament',
            index=models.Index(fields=['approval_status', 'created_at'], name='tournaments_approval_created_idx'),
        ),
        migrations.AddIndex(
            model_name='tournament',
            index=models.Index(fields=['sport_type', 'approval_status'], name='tournaments_sport_approval_idx'),
        ),
        migrations.AddIndex(
            model_name='tournament',
            index=models.Index(fields=['organizer', 'approval_status'], name='tournaments_organizer_approval_idx'),
        ),
        migrations.AddIndex(
            model_name='tournament',
            index=models.Index(fields=['date', 'approval_status'], name='tournaments_date_approval_idx'),
        ),
    ]
