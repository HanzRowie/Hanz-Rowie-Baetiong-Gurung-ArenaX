# Generated migration for referee payment tracking model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
        ('tournaments', '0014_fix_audit_log_tournament_on_delete'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('referees', '0008_add_referee_fee_and_payment_tracking'),
    ]

    operations = [
        migrations.CreateModel(
            name='RefereePaymentRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='NPR', max_length=3)),
                ('payment_status', models.CharField(choices=[('PENDING', 'Pending'), ('HELD_IN_ESCROW', 'Held in Escrow'), ('PROCESSING', 'Processing'), ('PAID', 'Paid'), ('FAILED', 'Failed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('description', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payment_tracking', to='referees.refereebooking')),
                ('match', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referee_payments', to='tournaments.match')),
                ('payment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='referee_payment_records', to='payments.payment')),
                ('referee', models.ForeignKey(limit_choices_to={'role': 'REFEREE'}, on_delete=django.db.models.deletion.CASCADE, related_name='payment_records', to=settings.AUTH_USER_MODEL)),
                ('tournament', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='referee_payments', to='tournaments.tournament')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='refereepaymentrecord',
            index=models.Index(fields=['referee', 'payment_status'], name='referees_re_referee_c8e8a5_idx'),
        ),
        migrations.AddIndex(
            model_name='refereepaymentrecord',
            index=models.Index(fields=['tournament'], name='referees_re_tournam_8f9a2c_idx'),
        ),
    ]
