from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_alter_payment_referee_booking_and_more'),
        ('accounts', '0001_initial'),
        ('tournaments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='refund',
            name='initiated_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='initiated_refunds',
                to='accounts.customuser',
            ),
        ),
        migrations.AddField(
            model_name='refund',
            name='tournament_registration',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='refunds',
                to='tournaments.tournamentregistration',
            ),
        ),
        migrations.AlterField(
            model_name='refund',
            name='refund_payment',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='original_refund',
                to='payments.payment',
            ),
        ),
    ]
