from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings


def send_verification_email(user, otp_code):
    """Send initial email verification OTP."""
    html_message = render_to_string('accounts/verify_email.html', {
        'full_name': user.full_name,
        'otp_code': otp_code,
    })
    send_mail(
        subject='Verify Your Email - ArenaX',
        message='',
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_resend_verification_email(user, otp_code):
    """Send a new verification OTP when the user requests a resend."""
    html_message = render_to_string('accounts/resend_verification.html', {
        'full_name': user.full_name,
        'otp_code': otp_code,
    })
    send_mail(
        subject='Email Verification - ArenaX',
        message='',
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, reset_url):
    """Send password reset link email."""
    html_message = render_to_string('accounts/reset_password.html', {
        'full_name': user.full_name,
        'reset_url': reset_url,
    })
    send_mail(
        subject='Password Reset - ArenaX',
        message='',
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
