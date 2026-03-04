# Generated migration to add ACCOUNT_APPROVED and ACCOUNT_REJECTED notification types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_adminauditlog_alter_customuser_options_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ('REGISTRATION_CONFIRMED', 'Registration Confirmed'),
                    ('REGISTRATION_REJECTED', 'Registration Rejected'),
                    ('TOURNAMENT_UPDATED', 'Tournament Updated'),
                    ('MATCH_SCHEDULED', 'Match Scheduled'),
                    ('BOOKING_CONFIRMED', 'Booking Confirmed'),
                    ('BOOKING_REQUESTED', 'Booking Requested'),
                    ('BOOKING_APPROVED', 'Booking Approved'),
                    ('BOOKING_REJECTED', 'Booking Rejected'),
                    ('BOOKING_CANCELLED', 'Booking Cancelled'),
                    ('PAYMENT_RECEIVED', 'Payment Received'),
                    ('PAYMENT_SUCCESSFUL', 'Payment Successful'),
                    ('PAYMENT_FAILED', 'Payment Failed'),
                    ('MATCH_ASSIGNED', 'Match Assigned'),
                    ('REFEREE_ASSIGNED', 'Referee Assigned'),
                    ('TOURNAMENT_STARTING', 'Tournament Starting'),
                    ('NEW_MESSAGE', 'New Message'),
                    ('NEW_GROUP_MESSAGE', 'New Group Message'),
                    ('ACCOUNT_APPROVED', 'Account Approved'),
                    ('ACCOUNT_REJECTED', 'Account Rejected'),
                    ('GENERAL', 'General Notification'),
                ],
                default='GENERAL',
                max_length=30,
            ),
        ),
    ]
