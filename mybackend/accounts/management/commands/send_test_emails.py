from django.core.management.base import BaseCommand
from accounts.email_utils import (
    send_verification_email,
    send_resend_verification_email,
    send_password_reset_email,
)


class FakeUser:
    def __init__(self, full_name, email):
        self.full_name = full_name
        self.email = email


class Command(BaseCommand):
    help = 'Send test emails for all three email templates'

    def add_arguments(self, parser):
        parser.add_argument('recipient', type=str, help='Email address to send test emails to')

    def handle(self, *args, **options):
        recipient = options['recipient']
        user = FakeUser(full_name='Test User', email=recipient)

        self.stdout.write(f'Sending test emails to {recipient}...\n')

        try:
            send_verification_email(user, '123456')
            self.stdout.write(self.style.SUCCESS('✓ Verification email sent'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Verification email failed: {e}'))

        try:
            send_resend_verification_email(user, '654321')
            self.stdout.write(self.style.SUCCESS('✓ Resend verification email sent'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Resend verification email failed: {e}'))

        try:
            send_password_reset_email(user, 'http://localhost:3000/reset-password?token=test-token-abc123')
            self.stdout.write(self.style.SUCCESS('✓ Password reset email sent'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Password reset email failed: {e}'))
