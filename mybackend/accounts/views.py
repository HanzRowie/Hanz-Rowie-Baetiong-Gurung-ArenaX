from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.contrib.auth import authenticate as django_authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q
from django.db import models
import random
import json
import re

from .models import CustomUser, BlacklistedToken, PlayerJoinRequest
from .decorators import jwt_required
from .models import EmailVerification, PasswordResetToken
from .serializers import EmailVerificationSerializer, PasswordResetTokenSerializer
from .utils import generate_access_token, generate_refresh_token
from .player_statistics import PlayerStatisticsService

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration with email verification"""
    try:
        data = request.data
        print(f"Register request data: {data}")  # Debug logging

        email = data.get('email')
        username = data.get('username') or email  # Use email as username if not provided
        full_name = data.get('full_name')
        password = data.get('password')
        role = data.get('role', 'PLAYER')
        phone_number = data.get('phone_number', '')  # Get phone number from registration

        if not all([email, full_name, password]):
            return Response({'error': 'Email, full name, and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent ADMIN role registration - admins can only be created via database/management command
        if role == 'ADMIN':
            return Response({'error': 'Cannot register as admin. Admin accounts must be created by system administrators.'}, status=status.HTTP_403_FORBIDDEN)

        if CustomUser.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Create user
        print(f"Creating user with: username={username}, email={email}, full_name={full_name}, role={role}, phone={phone_number}")  # Debug logging
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            phone_number=phone_number  # Save phone number during registration
        )
        print(f"User created successfully: {user.id}")  # Debug logging

        # Create email verification OTP
        otp = EmailVerification.objects.create(user=user)
        otp.otp = EmailVerification.generate_otp()
        otp.save()

        # Send OTP via email
        try:
            subject = 'Verify Your Email - ArenaX'
            message = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - ArenaX</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8f9fa;
        }}
        .container {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 20px;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .logo {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        .content {{
            background: white;
            padding: 40px 30px;
        }}
        .greeting {{
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }}
        .otp-container {{
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
        }}
        .otp-code {{
            font-size: 36px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }}
        .expiry {{
            color: #ef4444;
            font-weight: 600;
            margin-top: 15px;
            font-size: 14px;
        }}
        .footer {{
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}
        .footer-text {{
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        .team {{
            color: #374151;
            font-weight: 600;
        }}
        .warning {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }}
        .warning-text {{
            color: #92400e;
            font-size: 14px;
            margin: 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎾 ArenaX</div>
            <h1>Welcome to ArenaX!</h1>
        </div>

        <div class="content">
            <div class="greeting">Hi {user.full_name},</div>

            <div class="message">
                Welcome to ArenaX! We're excited to have you join our sports community.
                To complete your registration and start connecting with players, please verify your email address.
            </div>

            <div class="otp-container">
                <div style="font-size: 18px; color: #374151; margin-bottom: 10px; font-weight: 600;">
                    Your Verification Code
                </div>
                <div class="otp-code">{otp.otp}</div>
                <div class="expiry">⏰ Expires in 10 minutes</div>
            </div>

            <div class="warning">
                <p class="warning-text">
                    <strong>Security Note:</strong> If you didn't create an account with ArenaX, please ignore this email.
                    Your account will remain unverified and no further action is needed.
                </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                    Need help? Contact our support team at
                    <a href="mailto:support@arenax.com" style="color: #4f46e5; text-decoration: none;">support@arenax.com</a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p class="footer-text">You're receiving this email because you signed up for ArenaX</p>
            <p class="team">Best regards,<br>The ArenaX Team</p>
        </div>
    </div>
</body>
</html>
            '''.strip()

            send_mail(
                subject=subject,
                message='',  # Plain text version (empty for now)
                html_message=message,  # HTML version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )

            print(f"OTP sent to {email}: {otp.otp}")  # Keep for debugging

        except Exception as email_error:
            print(f"Failed to send email to {email}: {str(email_error)}")
            # Don't fail registration if email fails, but log it

        return Response({
            'message': 'User registered successfully. Please verify your email.',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Registration failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify email with OTP"""
    email = request.data.get('email')
    otp_code = request.data.get('otp')

    if not all([email, otp_code]):
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(email=email)
        verification = EmailVerification.objects.filter(
            user=user,
            otp=otp_code,
            is_used=False
        ).latest('created_at')

        if verification.is_valid():
            user.is_verified = True
            user.save()
            verification.is_used = True
            verification.save()

            return Response({'message': 'Email verified successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)

    except (CustomUser.DoesNotExist, EmailVerification.DoesNotExist):
        return Response({'error': 'Invalid email or OTP'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not all([email, password]):
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)
    if user:
        if not user.is_verified:
            return Response({'error': 'Please verify your email first'}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate proper JWT tokens - separate access and refresh tokens
        access_token = generate_access_token(user)
        refresh_token = generate_refresh_token(user)

        return Response({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@jwt_required
def logout(request):
    """User logout - invalidate refresh token by adding it to blacklist"""
    try:
        user = request.user
        refresh_token = request.data.get('refresh_token')

        
        if refresh_token:
            try:
               
                BlacklistedToken.objects.create(
                    token=refresh_token,
                    user=user,
                    expires_at=timezone.now() + timedelta(days=7)  # Same as token expiry
                )
                print(f"Refresh token blacklisted for user: {user.email}")
            except Exception as blacklist_error:
                print(f"Failed to blacklist token for user {user.email}: {str(blacklist_error)}")
                # Continue with logout even if blacklisting fails

        # Update last login timestamp to track logout
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        # Log the logout event
        print(f"User {user.email} logged out at {timezone.now()}")

        return Response({
            'message': 'Logged out successfully',
            'user_id': str(user.id),
            'logout_time': timezone.now().isoformat(),
            'note': 'Please clear all stored tokens from your application'
        }, status=status.HTTP_200_OK)

    except CustomUser.DoesNotExist:
        return Response({
            'error': 'User not found',
            'message': 'Logout processed but user record not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Logout error for user_id {getattr(request, 'user_id', 'unknown')}: {str(e)}")
        return Response({
            'error': 'Logout failed',
            'message': 'An error occurred during logout process'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token using refresh token"""
    refresh_token_value = request.data.get('refresh_token')

    if not refresh_token_value:
        return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if token is blacklisted
    if BlacklistedToken.is_token_blacklisted(refresh_token_value):
        return Response({'error': 'Token has been revoked'}, status=status.HTTP_401_UNAUTHORIZED)

    # Validate the refresh token
    try:
        from .utils import decode_jwt
        payload = decode_jwt(refresh_token_value)

        if payload is None:
            return Response({'error': 'Invalid or expired refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

        # Get the user
        try:
            user = CustomUser.objects.get(id=payload['user_id'])
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if user is active and verified
        if not user.is_active or not user.is_verified:
            return Response({'error': 'User account is inactive or not verified'}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate new tokens - separate access and refresh tokens
        new_access_token = generate_access_token(user)
        new_refresh_token = generate_refresh_token(user)

        return Response({
            'access_token': new_access_token,
            'refresh_token': new_refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Refresh token error: {str(e)}")
        return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    """Resend email verification OTP"""
    email = request.data.get('email')

    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(email=email)
        if user.is_verified:
            return Response({'error': 'Email already verified'}, status=status.HTTP_400_BAD_REQUEST)

        # Create new OTP
        otp = EmailVerification.objects.create(user=user)
        otp.otp = EmailVerification.generate_otp()
        otp.save()

        # Send OTP via email
        try:
            subject = 'Email Verification - ArenaX'
            message = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - ArenaX</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8f9fa;
        }}
        .container {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 20px;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .logo {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        .content {{
            background: white;
            padding: 40px 30px;
        }}
        .greeting {{
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }}
        .otp-container {{
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
        }}
        .otp-code {{
            font-size: 36px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }}
        .expiry {{
            color: #ef4444;
            font-weight: 600;
            margin-top: 15px;
            font-size: 14px;
        }}
        .footer {{
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}
        .footer-text {{
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        .team {{
            color: #374151;
            font-weight: 600;
        }}
        .warning {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }}
        .warning-text {{
            color: #92400e;
            font-size: 14px;
            margin: 0;
        }}
        .highlight {{
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }}
        .highlight-text {{
            color: #1e40af;
            font-size: 14px;
            margin: 0;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎾 ArenaX</div>
            <h1>New Verification Code</h1>
        </div>

        <div class="content">
            <div class="greeting">Hi {user.full_name},</div>

            <div class="message">
                We received your request for a new verification code. Here is your updated code to verify your ArenaX account.
            </div>

            <div class="highlight">
                <p class="highlight-text">
                    <strong>Requested:</strong> You asked for a new verification code. This previous code has been invalidated.
                </p>
            </div>

            <div class="otp-container">
                <div style="font-size: 18px; color: #374151; margin-bottom: 10px; font-weight: 600;">
                    Your New Verification Code
                </div>
                <div class="otp-code">{otp.otp}</div>
                <div class="expiry">⏰ Expires in 10 minutes</div>
            </div>

            <div class="warning">
                <p class="warning-text">
                    <strong>Security Note:</strong> If you didn't request this new code, someone may be trying to access your account.
                    Please contact our support team immediately.
                </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                    Need help? Contact our support team at
                    <a href="mailto:support@arenax.com" style="color: #4f46e5; text-decoration: none;">support@arenax.com</a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p class="footer-text">You're receiving this email because you requested a new verification code for ArenaX</p>
            <p class="team">Best regards,<br>The ArenaX Team</p>
        </div>
    </div>
</body>
</html>
            '''.strip()

            send_mail(
                subject=subject,
                message='',  # Plain text version (empty for now)
                html_message=message,  # HTML version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )

            print(f"New OTP sent to {email}: {otp.otp}")  # Keep for debugging

        except Exception as email_error:
            print(f"Failed to send email to {email}: {str(email_error)}")
            return Response({'error': 'Failed to send email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'New OTP sent to your email'}, status=status.HTTP_200_OK)

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Request password reset"""
    email = request.data.get('email')

    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = CustomUser.objects.get(email=email)
        if not user.is_verified:
            return Response({'error': 'Please verify your email first'}, status=status.HTTP_400_BAD_REQUEST)

        # Create password reset token
        reset_token = PasswordResetToken.objects.create(user=user)
        reset_token.token = PasswordResetToken.generate_token()
        reset_token.save()

        # Send reset email
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token.token}"
            subject = 'Password Reset - ArenaX'
            message = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - ArenaX</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8f9fa;
        }}
        .container {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 20px;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }}
        .logo {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        .content {{
            background: white;
            padding: 40px 30px;
        }}
        .greeting {{
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }}
        .reset-button {{
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
            transition: transform 0.2s;
        }}
        .reset-button:hover {{
            transform: translateY(-2px);
        }}
        .reset-link {{
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
            color: #4f46e5;
        }}
        .expiry {{
            color: #ef4444;
            font-weight: 600;
            margin-top: 15px;
            font-size: 14px;
        }}
        .footer {{
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}
        .footer-text {{
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        .team {{
            color: #374151;
            font-weight: 600;
        }}
        .warning {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }}
        .warning-text {{
            color: #92400e;
            font-size: 14px;
            margin: 0;
        }}
        .security-icon {{
            color: #f59e0b;
            font-size: 20px;
            margin-right: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎾 ArenaX</div>
            <h1>Reset Your Password</h1>
        </div>

        <div class="content">
            <div class="greeting">Hi {user.full_name},</div>

            <div class="message">
                We received a request to reset your password for your ArenaX account.
                Click the button below to create a new password.
            </div>

            <div style="text-align: center;">
                <a href="{reset_url}" class="reset-button">
                    🔐 Reset My Password
                </a>
            </div>

            <div class="message">
                If the button doesn't work, copy and paste this link into your browser:
            </div>

            <div class="reset-link">
                {reset_url}
            </div>

            <div class="expiry">
                ⏰ <strong>This link will expire in 1 hour</strong> for your security.
            </div>

            <div class="warning">
                <p class="warning-text">
                    <span class="security-icon">⚠️</span>
                    <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.
                    Your password will remain unchanged and your account is safe.
                </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                    Need help? Contact our support team at
                    <a href="mailto:support@arenax.com" style="color: #4f46e5; text-decoration: none;">support@arenax.com</a>
                </p>
            </div>
        </div>

        <div class="footer">
            <p class="footer-text">You're receiving this email because a password reset was requested for your ArenaX account</p>
            <p class="team">Best regards,<br>The ArenaX Team</p>
        </div>
    </div>
</body>
</html>
            '''.strip()

            send_mail(
                subject=subject,
                message='',  # Plain text version (empty for now)
                html_message=message,  # HTML version
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )

            print(f"Password reset token sent to {email}: {reset_token.token}")  # Keep for debugging

        except Exception as email_error:
            print(f"Failed to send reset email to {email}: {str(email_error)}")
            return Response({'error': 'Failed to send email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'Password reset email sent'}, status=status.HTTP_200_OK)

    except CustomUser.DoesNotExist:
        # Don't reveal if email exists or not for security
        return Response({'message': 'If an account with this email exists, a password reset email has been sent'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with token"""
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not all([token, new_password]):
        return Response({'error': 'Token and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_token = PasswordResetToken.objects.get(token=token, is_used=False)

        if not reset_token.is_valid():
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.is_used = True
        reset_token.save()

        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)

    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change current user's password"""
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not all([current_password, new_password, confirm_password]):
        return Response({'error': 'Current password, new password, and confirm password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'New password and confirm password do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters long'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = request.user

        # Verify current password
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if new password is different from current
        if user.check_password(new_password):
            return Response({'error': 'New password must be different from current password'}, status=status.HTTP_400_BAD_REQUEST)

        # Update password
        user.set_password(new_password)
        user.save()

        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': 'An error occurred while changing password'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Profile management views from core/profile_views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, user_id=None):
    """Get user profile (own or another user's public profile)"""
    try:
        current_user = request.user

        # If no user_id provided, return current user's profile
        if user_id is None:
            user = current_user
            is_own_profile = True
        else:
            user = get_object_or_404(CustomUser, id=user_id)
            is_own_profile = (user.id == current_user.id)

        # Basic profile data
        profile_data = {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email if is_own_profile else None,  # Only show email for own profile
            "phone_number": user.phone_number if is_own_profile else None,
            "role": user.role,
            "bio": user.bio,
            "location": user.location,
            "country": user.country,
            "date_of_birth": user.date_of_birth.isoformat() if user.date_of_birth else None,
            "gender": user.gender,
            "preferred_sports": user.preferred_sports,
            "skill_level": user.skill_level,
            "achievements": user.achievements,
            "social_links": user.social_links,
            "is_available_for_matches": user.is_available_for_matches,
            "profile_picture": user.profile_picture.url if user.profile_picture else None,
            "date_joined": user.date_joined.isoformat(),
            "is_verified": user.is_verified
        }

        # Add statistics based on role
        if user.role == 'PLAYER':
            # Player statistics
            from tournaments.models import TournamentRegistration, Match
            registrations = TournamentRegistration.objects.filter(player=user, status='ACCEPTED')
            from django.db.models import Q
            matches_played = Match.objects.filter(
                tournament__in=[reg.tournament for reg in registrations],
                status='COMPLETED'
            ).filter(
                Q(player1=user) | Q(player2=user)
            )
            matches_won = matches_played.filter(winner=user)

            profile_data.update({
                "tournaments_participated": registrations.count(),
                "matches_played": matches_played.count(),
                "matches_won": matches_won.count(),
                "win_rate": (matches_won.count() / matches_played.count() * 100) if matches_played.count() > 0 else 0
            })

        elif user.role == 'ORGANIZER':
            # Organizer statistics
            from tournaments.models import Tournament
            organized_tournaments = Tournament.objects.filter(organizer=user)

            profile_data.update({
                "tournaments_organized": organized_tournaments.count(),
                "total_participants": sum(t.registered_count for t in organized_tournaments)
            })

        return Response({"profile": profile_data})

    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """Update current user's profile"""
    try:
        user = request.user
        data = request.data

        # Debug logging
        print(f"Update profile request from user: {user.email}")
        print(f"Request data: {data}")
        print(f"Request FILES: {request.FILES}")

        # Update allowed fields
        updatable_fields = [
            'full_name', 'phone_number', 'bio', 'location',
            'country', 'gender',
            'skill_level', 'achievements'
        ]

        for field in updatable_fields:
            if field in data:
                setattr(user, field, data[field])

        # Handle date_of_birth separately (needs parsing)
        if 'date_of_birth' in data and data['date_of_birth']:
            try:
                from datetime import datetime
                user.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            except (ValueError, TypeError) as e:
                return Response({
                    "error": f"Invalid date format for date_of_birth: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Handle boolean field separately
        if 'is_available_for_matches' in data:
            value = data['is_available_for_matches']
            if isinstance(value, str):
                user.is_available_for_matches = value.lower() in ('true', '1', 'yes', 'on')
            else:
                user.is_available_for_matches = bool(value)

        # Handle JSON fields
        if 'preferred_sports' in data:
            try:
                import json
                if isinstance(data['preferred_sports'], str):
                    user.preferred_sports = json.loads(data['preferred_sports'])
                else:
                    user.preferred_sports = data['preferred_sports']
            except (json.JSONDecodeError, TypeError):
                return Response({
                    "error": "Invalid format for preferred_sports"
                }, status=status.HTTP_400_BAD_REQUEST)

        if 'social_links' in data:
            try:
                import json
                if isinstance(data['social_links'], str):
                    user.social_links = json.loads(data['social_links'])
                else:
                    user.social_links = data['social_links']
            except (json.JSONDecodeError, TypeError):
                return Response({
                    "error": "Invalid format for social_links"
                }, status=status.HTTP_400_BAD_REQUEST)

        # Handle profile picture upload
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']

        user.save()

        return Response({
            "message": "Profile updated successfully",
            "profile": {
                "id": str(user.id),
                "full_name": user.full_name,
                "bio": user.bio,
                "location": user.location,
                "preferred_sports": user.preferred_sports,
                "skill_level": user.skill_level,
                "profile_picture": user.profile_picture.url if user.profile_picture else None
            }
        })

    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Profile update error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def search_players(request):
    """Search for players by name, location, or sport"""
    try:
        query = request.GET.get('q', '').strip()
        sport = request.GET.get('sport', '').strip()
        location = request.GET.get('location', '').strip()
        skill_level = request.GET.get('skill_level', '').strip()

        players = CustomUser.objects.filter(role='PLAYER', is_verified=True)

        if query:
            from django.db.models import Q
            players = players.filter(
                Q(full_name__icontains=query) |
                Q(bio__icontains=query)
            )

        if sport:
            players = players.filter(preferred_sports__icontains=sport)

        if location:
            players = players.filter(location__icontains=location)

        if skill_level:
            players = players.filter(skill_level=skill_level)

        # Get all players for enhanced matching if no specific filters
        all_players = players if (query or sport or location or skill_level) else CustomUser.objects.filter(role='PLAYER', is_verified=True)

        # Enhanced matching algorithm (only if user is authenticated)
        enhanced_players = []
        current_user = None

        # Check if user is authenticated by looking for user_id in request
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                current_user = request.user
                enhanced_players = find_matching_players(current_user, all_players.exclude(id=request.user.id))
            except CustomUser.DoesNotExist:
                pass

        # Apply filters to enhanced results if filters were provided
        if enhanced_players and (query or sport or location or skill_level):
            enhanced_players = [p for p in enhanced_players if p['player'] in players]
        elif enhanced_players:
            # Take top 20 compatible players
            enhanced_players = enhanced_players[:20]

        # Fallback to basic filtering if no enhanced results or no authenticated user
        if not enhanced_players:
            players = players[:20]
            player_list = []
            for player in players:
                player_list.append({
                    "id": str(player.id),
                    "full_name": player.full_name,
                    "bio": player.bio[:100] + "..." if len(player.bio) > 100 else player.bio,
                    "location": player.location,
                    "preferred_sports": player.preferred_sports,
                    "skill_level": player.skill_level,
                    "profile_picture": player.profile_picture.url if player.profile_picture else None,
                    "is_available_for_matches": player.is_available_for_matches,
                    "match_score": 0,
                    "match_reasons": []
                })

            return Response({
                "players": player_list,
                "count": len(player_list),
                "enhanced_matching": False
            })

        # Format enhanced results
        player_list = []
        for match_data in enhanced_players:
            player = match_data['player']
            player_data = {
                "id": str(player.id),
                "full_name": player.full_name,
                "bio": player.bio[:100] + "..." if len(player.bio) > 100 else player.bio,
                "location": player.location,
                "preferred_sports": player.preferred_sports,
                "skill_level": player.skill_level,
                "profile_picture": player.profile_picture.url if player.profile_picture else None,
                "is_available_for_matches": player.is_available_for_matches,
                "match_score": match_data['score'],
                "match_reasons": match_data['reasons']
            }
            player_list.append(player_data)

        return Response({
            "players": player_list,
            "count": len(player_list),
            "enhanced_matching": True
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Admin functionality for viewing all user data
def check_admin_access(user):
    """Check if user has admin access"""
    return user.role == 'ADMIN'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_all_users(request):
    """Admin view to get list of all users (admin access only)"""
    user = request.user

    if not check_admin_access(user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    # Get query parameters for filtering
    role = request.GET.get('role')
    search = request.GET.get('search', '').strip()
    is_verified = request.GET.get('is_verified')

    users = CustomUser.objects.all().order_by('-created_at')

    # Apply filters
    if role:
        users = users.filter(role=role)

    if search:
        from django.db.models import Q
        users = users.filter(
            Q(full_name__icontains=search) |
            Q(email__icontains=search) |
            Q(username__icontains=search)
        )

    if is_verified is not None:
        is_verified_bool = is_verified.lower() in ('true', '1', 'yes')
        users = users.filter(is_verified=is_verified_bool)

    # Paginate results (simple implementation)
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    start = (page - 1) * per_page
    end = start + per_page

    total_users = users.count()
    users_page = users[start:end]

    # Serialize user data
    users_data = []
    for u in users_page:
        users_data.append({
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'full_name': u.full_name,
            'phone_number': u.phone_number,
            'role': u.role,
            'is_verified': u.is_verified,
            'profile_picture': u.profile_picture.url if u.profile_picture else None,
            'location': u.location,
            'country': u.country,
            'preferred_sports': u.preferred_sports,
            'skill_level': u.skill_level,
            'is_available_for_matches': u.is_available_for_matches,
            'matches_played': u.matches_played,
            'matches_won': u.matches_won,
            'win_rate': u.win_rate,
            'created_at': u.created_at.isoformat(),
            'updated_at': u.updated_at.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
        })

    return Response({
        'users': users_data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total_users,
            'total_pages': (total_users + per_page - 1) // per_page
        }
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_user_details(request, user_id):
    """Admin view to get detailed information about a specific user (admin access only)"""
    user = request.user

    if not check_admin_access(user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get comprehensive user data
    user_data = {
        'id': str(target_user.id),
        'username': target_user.username,
        'email': target_user.email,
        'full_name': target_user.full_name,
        'phone_number': target_user.phone_number,
        'role': target_user.role,
        'is_verified': target_user.is_verified,
        'profile_picture': target_user.profile_picture.url if target_user.profile_picture else None,
        'bio': target_user.bio,
        'location': target_user.location,
        'country': target_user.country,
        'date_of_birth': target_user.date_of_birth.isoformat() if target_user.date_of_birth else None,
        'gender': target_user.gender,
        'preferred_sports': target_user.preferred_sports,
        'skill_level': target_user.skill_level,
        'achievements': target_user.achievements,
        'social_links': target_user.social_links,
        'is_available_for_matches': target_user.is_available_for_matches,
        'matches_played': target_user.matches_played,
        'matches_won': target_user.matches_won,
        'win_rate': target_user.win_rate,
        'wta_ranking': target_user.wta_ranking,
        'atp_ranking': target_user.atp_ranking,
        'created_at': target_user.created_at.isoformat(),
        'updated_at': target_user.updated_at.isoformat(),
        'last_login': target_user.last_login.isoformat() if target_user.last_login else None,
    }

    # Add role-specific statistics
    if target_user.role == 'PLAYER':
        # Player-specific stats
        from tournaments.models import TournamentRegistration
        total_tournaments = TournamentRegistration.objects.filter(
            player=target_user,
            status='ACCEPTED'
        ).count()

        user_data.update({
            'player_stats': {
                'total_tournaments_participated': total_tournaments,
                'matches_played': target_user.matches_played,
                'matches_won': target_user.matches_won,
                'win_rate': target_user.win_rate,
            }
        })

    elif target_user.role == 'ORGANIZER':
        # Organizer-specific stats
        from tournaments.models import Tournament
        organized_tournaments = Tournament.objects.filter(organizer=target_user)

        total_participants = sum(t.registered_count for t in organized_tournaments)
        total_revenue = sum(float(t.entry_fee) * t.registered_count for t in organized_tournaments)

        user_data.update({
            'organizer_stats': {
                'total_tournaments_organized': organized_tournaments.count(),
                'total_participants': total_participants,
                'total_revenue': total_revenue,
            }
        })

    return Response({
        'user': user_data
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    """Admin dashboard with system-wide statistics"""
    user = request.user

    if not check_admin_access(user):
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    # User statistics
    total_users = CustomUser.objects.count()
    verified_users = CustomUser.objects.filter(is_verified=True).count()
    unverified_users = total_users - verified_users

    # Role distribution
    role_counts = {}
    for role_choice in CustomUser.ROLE_CHOICES:
        role_code = role_choice[0]
        role_counts[role_code.lower()] = CustomUser.objects.filter(role=role_code).count()

    # Tournament statistics
    from tournaments.models import Tournament, TournamentRegistration
    total_tournaments = Tournament.objects.count()
    active_tournaments = Tournament.objects.filter(status='ONGOING').count()
    completed_tournaments = Tournament.objects.filter(status='COMPLETED').count()

    total_registrations = TournamentRegistration.objects.filter(status='ACCEPTED').count()
    total_revenue = TournamentRegistration.objects.filter(
        tournament__status='COMPLETED',
        status='ACCEPTED'
    ).aggregate(total=Sum('tournament__entry_fee'))['total'] or 0

    # Recent activity (last 30 days)
    from django.utils import timezone
    from datetime import timedelta
    thirty_days_ago = timezone.now() - timedelta(days=30)

    new_users_30d = CustomUser.objects.filter(created_at__gte=thirty_days_ago).count()
    new_tournaments_30d = Tournament.objects.filter(created_at__gte=thirty_days_ago).count()

    return Response({
        'user_stats': {
            'total_users': total_users,
            'verified_users': verified_users,
            'unverified_users': unverified_users,
            'new_users_30d': new_users_30d,
            'role_distribution': role_counts,
        },
        'tournament_stats': {
            'total_tournaments': total_tournaments,
            'active_tournaments': active_tournaments,
            'completed_tournaments': completed_tournaments,
            'total_registrations': total_registrations,
            'total_revenue': float(total_revenue),
            'new_tournaments_30d': new_tournaments_30d,
        }
    }, status=status.HTTP_200_OK)

def find_matching_players(current_user, potential_players):
    """
    Enhanced player matching algorithm that considers:
    - Common sports interests
    - Skill level compatibility
    - Location proximity
    - Availability
    - Bio keywords
    """
    matches = []

    for player in potential_players:
        score = 0
        reasons = []

        # Sport compatibility (major factor)
        if current_user.preferred_sports and player.preferred_sports:
            common_sports = set(current_user.preferred_sports) & set(player.preferred_sports)
            if common_sports:
                score += len(common_sports) * 30  # 30 points per common sport
                reasons.append(f"Shares {len(common_sports)} common sport(s): {', '.join(common_sports)}")
            else:
                score -= 15  # Penalty for no common sports
                reasons.append("No common sports")

        # Skill level compatibility
        if current_user.skill_level and player.skill_level:
            skill_levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']
            try:
                current_idx = skill_levels.index(current_user.skill_level)
                player_idx = skill_levels.index(player.skill_level)
                skill_diff = abs(current_idx - player_idx)

                if skill_diff == 0:
                    score += 25  # Same skill level
                    reasons.append(f"Matching skill level: {current_user.skill_level}")
                elif skill_diff == 1:
                    score += 15  # Adjacent skill levels
                    reasons.append(f"Compatible skill levels: you ({current_user.skill_level}) + them ({player.skill_level})")
                else:
                    score -= 10  # Large skill difference
                    reasons.append(f"Different skill levels: you ({current_user.skill_level}) vs them ({player.skill_level})")
            except ValueError:
                pass

        # Location proximity
        if current_user.location and player.location:
            # Simple string matching for location (could be enhanced with geocoding)
            if current_user.location.lower().strip() == player.location.lower().strip():
                score += 20
                reasons.append(f"Same location: {current_user.location}")
            elif (current_user.location.lower() in player.location.lower() or
                  player.location.lower() in current_user.location.lower()):
                score += 10
                reasons.append("Nearby locations")

        # Availability matching
        if current_user.is_available_for_matches and player.is_available_for_matches:
            score += 15
            reasons.append("Both available for matches")
        elif not current_user.is_available_for_matches and not player.is_available_for_matches:
            score += 5
            reasons.append("Both prefer to be players rather than organizers")

        # Bio keyword matching (if both have bios)
        if current_user.bio and player.bio:
            current_keywords = set(current_user.bio.lower().split())
            player_keywords = set(player.bio.lower().split())
            common_keywords = current_keywords & player_keywords

            if common_keywords:
                # Filter out common stop words
                stop_words = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
                            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
                            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
                            'this', 'that', 'these', 'those', 'and', 'or', 'but', 'so', 'because', 'although'}
                meaningful_keywords = common_keywords - stop_words

                if meaningful_keywords:
                    score += len(meaningful_keywords) * 5  # 5 points per meaningful keyword
                    if len(meaningful_keywords) <= 3:
                        reasons.append(f"Bio commonalities: {', '.join(meaningful_keywords)}")

        # Tournament participation compatibility
        try:
            from tournaments.models import TournamentRegistration
            current_registrations = TournamentRegistration.objects.filter(player=current_user, status='ACCEPTED').count()
            player_registrations = TournamentRegistration.objects.filter(player=player, status='ACCEPTED').count()

            if current_registrations > 0 and player_registrations > 0:
                # Similar tournament experience
                experience_diff = abs(current_registrations - player_registrations)
                if experience_diff <= 2:
                    score += 10
                    reasons.append(f"Similar tournament experience ({player_registrations} tournaments)")
                elif experience_diff <= 5:
                    score += 5
                    reasons.append(f"Comparable tournament experience")
        except:
            pass

        # Only include players with positive score (weak matching threshold)
        if score > 0:
            matches.append({
                'player': player,
                'score': score,
                'reasons': reasons
            })

    # Sort by match score (highest first)
    matches.sort(key=lambda x: x['score'], reverse=True)

    # Normalize scores to percentage (0-100%)
    # Define maximum possible score for normalization
    max_possible_score = 150  # Reasonable maximum based on scoring criteria
    
    for match in matches:
        # Convert to percentage and cap at 100%
        percentage = min(100, (match['score'] / max_possible_score) * 100)
        match['score'] = round(percentage, 1)

    return matches

# Additional user endpoints that the frontend expects
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_statistics(request):
    """Get user statistics"""
    try:
        user = request.user

        stats = {
            'tournaments_participated': 0,
            'matches_played': user.matches_played or 0,
            'matches_won': user.matches_won or 0,
            'win_rate': user.win_rate or 0,
            'tournaments_organized': 0,
            'total_earnings': 0
        }

        if user.role == 'PLAYER':
            from tournaments.models import TournamentRegistration
            stats['tournaments_participated'] = TournamentRegistration.objects.filter(
                player=user, status='ACCEPTED'
            ).count()

        elif user.role == 'ORGANIZER':
            from tournaments.models import Tournament
            organized_tournaments = Tournament.objects.filter(organizer=user)
            stats['tournaments_organized'] = organized_tournaments.count()

        return Response({'statistics': stats})

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity(request):
    """Get user recent activity"""
    try:
        user = request.user

        activities = []

        # Recent tournament registrations
        from tournaments.models import TournamentRegistration
        recent_regs = TournamentRegistration.objects.filter(
            player=user
        ).order_by('-created_at')[:5]

        for reg in recent_regs:
            activities.append({
                'type': 'tournament_registration',
                'title': f'Registered for {reg.tournament.title}',
                'timestamp': reg.created_at.isoformat(),
                'status': reg.status
            })

        # Recent matches
        from tournaments.models import Match
        from django.db.models import Q
        recent_matches = Match.objects.filter(
            Q(player1=user) | Q(player2=user),
            status='COMPLETED'
        ).order_by('-updated_at')[:5]

        for match in recent_matches:
            result = 'won' if match.winner == user else 'lost'
            activities.append({
                'type': 'match_result',
                'title': f'Match {result} against {match.player2.full_name if match.player1 == user else match.player1.full_name}',
                'timestamp': match.updated_at.isoformat(),
                'result': result
            })

        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({'activities': activities[:10]})  # Return top 10

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_achievements(request):
    """Get user achievements"""
    try:
        user = request.user

        achievements = []

        # Tournament wins (based on matches won)
        from tournaments.models import Match
        won_matches = Match.objects.filter(winner=user, status='COMPLETED')
        if won_matches.exists():
            achievements.append({
                'title': 'Match Winner',
                'description': f'Won {won_matches.count()} match(es)',
                'icon': '🏆',
                'count': won_matches.count()
            })

        # Match win streaks or high win rate
        if user.win_rate and user.win_rate > 70:
            achievements.append({
                'title': 'High Performer',
                'description': f'Maintains a {user.win_rate:.1f}% win rate',
                'icon': '⭐',
                'count': int(user.win_rate)
            })

        # Tournament participations
        from tournaments.models import TournamentRegistration
        total_participations = TournamentRegistration.objects.filter(
            player=user, status='ACCEPTED'
        ).count()

        if total_participations >= 10:
            achievements.append({
                'title': 'Dedicated Player',
                'description': f'Participated in {total_participations} tournaments',
                'icon': '🎾',
                'count': total_participations
            })

        # User achievements from profile
        if user.achievements:
            for achievement in user.achievements:
                achievements.append({
                    'title': achievement.get('title', 'Achievement'),
                    'description': achievement.get('description', ''),
                    'icon': achievement.get('icon', '🎯'),
                    'count': achievement.get('count', 1)
                })

        return Response({'achievements': achievements})

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_connections(request):
    """Get user connections/friends (accepted join requests)"""
    print(f"get_user_connections called for user_id: {request.user.id}")
    try:
        user = request.user
        print(f"User found: {user.full_name}")

        # Get accepted connection requests where user is either sender or receiver
        accepted_requests = PlayerJoinRequest.objects.filter(
            Q(from_player=user) | Q(to_player=user),
            status='accepted'
        ).select_related('from_player', 'to_player')
        print(f"Accepted connections: {accepted_requests.count()}")

        connections = []
        for req in accepted_requests:
            # Get the other player (not the current user)
            other_player = req.to_player if req.from_player == user else req.from_player
            
            connections.append({
                'id': str(other_player.id),
                'full_name': other_player.full_name,
                'email': other_player.email,
                'profile_picture': other_player.profile_picture.url if other_player.profile_picture else None,
                'skill_level': other_player.skill_level,
                'location': other_player.location,
                'bio': other_player.bio,
                'preferred_sports': other_player.preferred_sports,
                'matches_played': other_player.matches_played,
                'matches_won': other_player.matches_won,
                'win_rate': other_player.win_rate,
                'connected_at': req.created_at.isoformat(),
                'is_available_for_matches': other_player.is_available_for_matches,
            })

        response_data = {
            'connections': connections,
            'total_connections': len(connections)
        }
        print(f"Response data: {response_data}")
        return Response(response_data)

    except CustomUser.DoesNotExist:
        print("User not found")
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recent_activity(request):
    """Get recent activity across the platform"""
    try:
        user = request.user

        activities = []

        # Recent tournaments created
        from tournaments.models import Tournament, TournamentRegistration
        recent_tournaments = Tournament.objects.filter(
            organizer=user
        ).order_by('-created_at')[:3]

        for tournament in recent_tournaments:
            activities.append({
                'type': 'tournament_created',
                'title': f'Created tournament: {tournament.title}',
                'timestamp': tournament.created_at.isoformat(),
                'data': {
                    'tournament_id': str(tournament.id),
                    'status': tournament.status
                }
            })

        # Recent tournament registrations by others
        recent_regs = TournamentRegistration.objects.filter(
            tournament__organizer=user
        ).exclude(player=user).order_by('-registered_at')[:3]

        for reg in recent_regs:
            activities.append({
                'type': 'new_registration',
                'title': f'{reg.player.full_name} registered for {reg.tournament.title}',
                'timestamp': reg.registered_at.isoformat(),
                'data': {
                    'tournament_id': str(reg.tournament.id),
                    'player_id': str(reg.player.id)
                }
            })

        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({'activities': activities[:10]})

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@jwt_required
def get_my_join_requests(request):
    """Get user's connection requests (both sent and received)"""
    try:
        user = request.user

        # Get connection requests sent by user
        sent_requests = PlayerJoinRequest.objects.filter(
            from_player=user
        ).select_related('to_player').order_by('-created_at')

        # Get connection requests received by user
        received_requests = PlayerJoinRequest.objects.filter(
            to_player=user
        ).select_related('from_player').order_by('-created_at')

        # Format sent requests
        sent_data = []
        for req in sent_requests:
            sent_data.append({
                'id': req.id,
                'type': 'sent',
                'to_player': {
                    'id': str(req.to_player.id),
                    'full_name': req.to_player.full_name,
                    'email': req.to_player.email,
                    'profile_picture': req.to_player.profile_picture.url if req.to_player.profile_picture else None,
                    'skill_level': req.to_player.skill_level,
                    'location': req.to_player.location,
                },
                'status': req.status.upper(),
                'created_at': req.created_at.isoformat(),
            })

        # Format received requests
        received_data = []
        for req in received_requests:
            received_data.append({
                'id': req.id,
                'type': 'received',
                'from_player': {
                    'id': str(req.from_player.id),
                    'full_name': req.from_player.full_name,
                    'email': req.from_player.email,
                    'profile_picture': req.from_player.profile_picture.url if req.from_player.profile_picture else None,
                    'skill_level': req.from_player.skill_level,
                    'location': req.from_player.location,
                },
                'status': req.status.upper(),
                'created_at': req.created_at.isoformat(),
            })

        response_data = {
            'sent_requests': sent_data,
            'received_requests': received_data,
            'sent_count': len(sent_data),
            'received_count': len(received_data),
            'pending_count': len([req for req in sent_data + received_data if req['status'] == 'PENDING'])
        }
        return Response(response_data)

    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@jwt_required
def send_join_request(request, user_id):
    """Send a connection request to another player"""
    try:
        from_user = request.user
        if from_user.role != 'PLAYER':
             return Response({'error': 'Only players can send connection requests'}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            to_user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Target user not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if to_user.role != 'PLAYER':
            return Response({'error': 'You can only connect with other players'}, status=status.HTTP_400_BAD_REQUEST)
            
        if from_user.id == to_user.id:
            return Response({'error': 'You cannot connect with yourself'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check if request already exists
        existing_request = PlayerJoinRequest.objects.filter(
            from_player=from_user,
            to_player=to_user
        ).first()
        
        if existing_request:
            return Response({'error': 'Request already sent', 'status': existing_request.status}, status=status.HTTP_400_BAD_REQUEST)
            
        # Check reverse request
        reverse_request = PlayerJoinRequest.objects.filter(
            from_player=to_user,
            to_player=from_user
        ).first()
        
        if reverse_request:
            if reverse_request.status == 'pending':
                return Response({'error': 'This user already sent you a request. Please check your received requests.', 'status': 'pending_received'}, status=status.HTTP_400_BAD_REQUEST)
            elif reverse_request.status == 'accepted':
                 return Response({'error': 'You are already connected', 'status': 'accepted'}, status=status.HTTP_400_BAD_REQUEST)

        # Create request
        join_request = PlayerJoinRequest.objects.create(
            from_player=from_user,
            to_player=to_user,
            status='pending'
        )
        
        # Create notification for the recipient
        from notifications.utils import send_notification
        send_notification(
            user=to_user,
            notification_type='CONNECTION_REQUEST',
            title='New Connection Request',
            message=f'{from_user.full_name} wants to connect with you',
            related_id=from_user.id,
            action_url=f'/connections'  # Navigate to connections page
        )
        
        return Response({
            'message': 'Connection request sent successfully',
            'request': {
                'id': str(join_request.id),
                'status': join_request.status
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@jwt_required
def respond_join_request(request, request_id):
    """Respond to a connection request"""
    try:
        user = request.user
        action = request.data.get('action') # accept or decline
        
        if action not in ['accept', 'decline']:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            join_request = PlayerJoinRequest.objects.get(id=request_id, to_player=user)
        except PlayerJoinRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
            
        if join_request.status != 'pending':
             return Response({'error': f'Request already {join_request.status}'}, status=status.HTTP_400_BAD_REQUEST)
             
        if action == 'accept':
            join_request.status = 'accepted'
            
            # Create notification for the sender
            from notifications.utils import send_notification
            send_notification(
                user=join_request.from_player,
                notification_type='CONNECTION_ACCEPTED',
                title='Connection Request Accepted',
                message=f'{user.full_name} accepted your connection request',
                related_id=user.id,
                action_url=f'/connections'  # Navigate to connections page
            )
        else:
            join_request.status = 'declined'
            
            # Optionally notify sender of rejection (you can remove this if you don't want to notify on rejection)
            from notifications.utils import send_notification
            send_notification(
                user=join_request.from_player,
                notification_type='CONNECTION_REJECTED',
                title='Connection Request Declined',
                message=f'{user.full_name} declined your connection request',
                related_id=user.id,
                action_url=f'/connections'
            )
            
        join_request.save()
        
        return Response({
            'message': f'Request {action}ed successfully',
            'request': {
                'id': str(join_request.id),
                'status': join_request.status
            }
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@jwt_required
def get_user_online_status(request, user_id):
    """Get user's online status"""
    try:
        user = CustomUser.objects.get(id=user_id)
        
        # Consider user online if they were active in the last 5 minutes
        from datetime import timedelta
        online_threshold = timezone.now() - timedelta(minutes=5)
        is_online = user.last_login and user.last_login > online_threshold
        
        return Response({
            'is_online': is_online,
            'last_seen': user.last_login.isoformat() if user.last_login else None
        })
        
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

# Dashboard Views (temporary - should be moved to separate app)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for the current user"""
    try:
        user = request.user
        
        # Basic stats - simplified to avoid complex queries that might hang
        stats = {
            'upcomingMatches': 0,
            'totalTournaments': 0,
            'totalParticipants': 0,
            'winRate': 0.0,
            'matchesWon': 0,
            'matchesPlayed': 0,
        }
        
        if user.role == 'PLAYER':
            try:
                from tournaments.models import TournamentRegistration, Match
                from teams.models import TeamTournamentRegistration, FutsalScore, TeamMembership
                from django.db.models import Q
                
                # Get tournament registrations - simplified query
                individual_registrations = TournamentRegistration.objects.filter(
                    player=user, 
                    status='ACCEPTED'
                ).count()
                
                team_registrations = TeamTournamentRegistration.objects.filter(
                    selected_players=user,
                    status='CONFIRMED'
                ).count()
                
                stats['totalTournaments'] = individual_registrations + team_registrations
                
                # Get individual matches played
                individual_matches = Match.objects.filter(
                    Q(player1=user) | Q(player2=user),
                    status='COMPLETED'
                ).count()

                # Get all teams the player is a member of
                player_teams = TeamMembership.objects.filter(
                    player=user,
                    is_active=True
                ).values_list('team_id', flat=True)
                
                # Get team-based matches played
                # Check for matches where any of the user's teams participated
                team_matches = Match.objects.filter(
                    Q(team1_id__in=player_teams) | Q(team2_id__in=player_teams),
                    status='COMPLETED'
                ).distinct().count()
                
                matches_played = individual_matches + team_matches
                stats['matchesPlayed'] = matches_played
                
                # Calculate individual wins
                individual_wins = Match.objects.filter(
                    winner=user,
                    status='COMPLETED'
                ).count()
                
                # Calculate team-based wins
                # Count matches where player's team won
                team_wins = Match.objects.filter(
                    winning_team_id__in=player_teams,
                    status='COMPLETED'
                ).distinct().count()
                
                matches_won = individual_wins + team_wins
                stats['matchesWon'] = matches_won
                stats['winRate'] = round((matches_won / matches_played * 100), 1) if matches_played > 0 else 0.0
                
            except Exception as e:
                print(f"Error calculating player stats: {e}")
                import traceback
                traceback.print_exc()
                # Return basic stats if calculation fails
                pass
            
        elif user.role == 'ORGANIZER':
            try:
                from tournaments.models import Tournament
                tournaments = Tournament.objects.filter(organizer=user).count()
                stats['totalTournaments'] = tournaments
            except Exception as e:
                print(f"Error calculating organizer stats: {e}")
                pass
                
        elif user.role == 'REFEREE':
            try:
                from referees.models import RefereeBooking
                bookings = RefereeBooking.objects.filter(referee=user).count()
                stats['totalTournaments'] = bookings
            except Exception as e:
                print(f"Error calculating referee stats: {e}")
                pass
        
        return Response(stats)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Dashboard stats error: {e}")
        # Return basic stats if everything fails
        return Response({
            'upcomingMatches': 0,
            'totalTournaments': 0,
            'totalParticipants': 0,
            'winRate': 0.0,
            'matchesWon': 0,
            'matchesPlayed': 0,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_monthly_stats(request):
    """Get monthly statistics for the current user"""
    try:
        user = request.user
        year = int(request.GET.get('year', timezone.now().year))
        
        if user.role != 'PLAYER':
            # Return empty stats for non-players
            monthly_stats = []
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            for i, month_name in enumerate(months, 1):
                monthly_stats.append({
                    'month': month_name,
                    'wins': 0,
                    'losses': 0,
                    'tournaments': 0
                })
            return Response(monthly_stats)
        
        from tournaments.models import Match
        from teams.models import TeamMembership, FutsalScore
        from django.db.models import Q
        from datetime import datetime
        
        # Get player's teams
        player_teams = TeamMembership.objects.filter(
            player=user,
            is_active=True
        ).values_list('team_id', flat=True)
        
        monthly_stats = []
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        for month_num in range(1, 13):
            # Individual matches
            individual_wins = Match.objects.filter(
                winner=user,
                status='COMPLETED',
                tournament__date__year=year,
                tournament__date__month=month_num
            ).count()
            
            individual_losses = Match.objects.filter(
                Q(player1=user) | Q(player2=user),
                status='COMPLETED',
                tournament__date__year=year,
                tournament__date__month=month_num
            ).exclude(winner=user).count()
            
            # Team-based wins
            team_wins = Match.objects.filter(
                winning_team_id__in=player_teams,
                status='COMPLETED',
                tournament__date__year=year,
                tournament__date__month=month_num
            ).filter(
                Q(team1_id__in=player_teams) | Q(team2_id__in=player_teams)
            ).distinct().count()
            
            # Team-based losses (matches where player's team played but didn't win)
            team_matches = Match.objects.filter(
                Q(team1_id__in=player_teams) | Q(team2_id__in=player_teams),
                status='COMPLETED',
                tournament__date__year=year,
                tournament__date__month=month_num
            ).distinct().count()
            
            team_losses = team_matches - team_wins
            
            total_wins = individual_wins + team_wins
            total_losses = individual_losses + team_losses
            
            monthly_stats.append({
                'month': months[month_num - 1],
                'wins': total_wins,
                'losses': total_losses,
                'tournaments': 0  # Can be enhanced later
            })
            
        return Response(monthly_stats)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Monthly stats error: {e}")
        # Return empty stats if calculation fails
        monthly_stats = []
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        for month_name in months:
            monthly_stats.append({
                'month': month_name,
                'wins': 0,
                'losses': 0,
                'tournaments': 0
            })
        return Response(monthly_stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_next_tournament(request):
    """Get next tournament and upcoming match for the current user"""
    try:
        user = request.user
        
        next_tournament = None
        if user.role == 'PLAYER':
            from tournaments.models import TournamentRegistration, Match
            from teams.models import TeamTournamentRegistration
            
            # Check for individual tournament registrations (only future tournaments)
            individual_registration = TournamentRegistration.objects.filter(
                player=user, 
                status='ACCEPTED',
                tournament__date__gte=timezone.now().date(),
                tournament__status__in=['UPCOMING', 'ONGOING']  # Exclude completed tournaments
            ).select_related('tournament').order_by('tournament__date').first()
            
            # Check for team tournament registrations (only future tournaments)
            team_registration = TeamTournamentRegistration.objects.filter(
                selected_players=user,
                status='CONFIRMED',
                tournament__date__gte=timezone.now().date(),
                tournament__status__in=['UPCOMING', 'ONGOING']  # Exclude completed tournaments
            ).select_related('tournament', 'team').order_by('tournament__date').first()
            
            # Determine which tournament is next
            tournament = None
            is_team_tournament = False
            
            if individual_registration and team_registration:
                # Both exist, pick the earlier one
                if individual_registration.tournament.date <= team_registration.tournament.date:
                    tournament = individual_registration.tournament
                    is_team_tournament = False
                else:
                    tournament = team_registration.tournament
                    is_team_tournament = True
            elif individual_registration:
                tournament = individual_registration.tournament
                is_team_tournament = False
            elif team_registration:
                tournament = team_registration.tournament
                is_team_tournament = True
            
            if tournament:
                next_tournament = {
                    'id': str(tournament.id),
                    'title': tournament.title,
                    'date': tournament.date.isoformat(),
                    'time': tournament.start_time.strftime('%H:%M'),
                    'venue': tournament.venue_name,
                    'sport': tournament.sport_type,
                    'registration_type': tournament.registration_type,
                    'match_scheduled': False,
                    'opponent': None,
                    'match_time': None,
                    'match_id': None
                }
                
                # Check for upcoming matches in this tournament
                upcoming_match = None
                
                if is_team_tournament:
                    # For team tournaments, find matches where user's team is playing
                    team = team_registration.team
                    upcoming_match = Match.objects.filter(
                        tournament=tournament,
                        status='SCHEDULED'
                    ).filter(
                        models.Q(team1=team) | models.Q(team2=team)
                    ).order_by('round_number', 'match_number').first()
                    
                    if upcoming_match:
                        # Determine opponent team
                        opponent_team = upcoming_match.team2 if upcoming_match.team1 == team else upcoming_match.team1
                        next_tournament.update({
                            'match_scheduled': True,
                            'opponent': {
                                'name': opponent_team.name if opponent_team else 'TBD',
                                'type': 'team'
                            },
                            'match_time': upcoming_match.scheduled_time.strftime('%H:%M') if upcoming_match.scheduled_time else None,
                            'match_id': str(upcoming_match.id),
                            'round_number': upcoming_match.round_number,
                            'match_number': upcoming_match.match_number
                        })
                else:
                    # For individual tournaments, find matches where user is playing
                    upcoming_match = Match.objects.filter(
                        tournament=tournament,
                        status='SCHEDULED'
                    ).filter(
                        models.Q(player1=user) | models.Q(player2=user)
                    ).order_by('round_number', 'match_number').first()
                    
                    if upcoming_match:
                        # Determine opponent player
                        opponent_player = upcoming_match.player2 if upcoming_match.player1 == user else upcoming_match.player1
                        next_tournament.update({
                            'match_scheduled': True,
                            'opponent': {
                                'name': opponent_player.full_name if opponent_player else 'TBD',
                                'type': 'player'
                            },
                            'match_time': upcoming_match.scheduled_time.strftime('%H:%M') if upcoming_match.scheduled_time else None,
                            'match_id': str(upcoming_match.id),
                            'round_number': upcoming_match.round_number,
                            'match_number': upcoming_match.match_number
                        })
                
        elif user.role == 'ORGANIZER':
            from tournaments.models import Tournament
            tournament = Tournament.objects.filter(
                organizer=user,
                date__gte=timezone.now().date(),
                status__in=['UPCOMING', 'ONGOING']  # Exclude completed tournaments
            ).order_by('date').first()
            
            if tournament:
                next_tournament = {
                    'id': str(tournament.id),
                    'title': tournament.title,
                    'date': tournament.date.isoformat(),
                    'time': tournament.start_time.strftime('%H:%M'),
                    'venue': tournament.venue_name,
                    'sport': tournament.sport_type,
                    'registration_type': tournament.registration_type
                }
        
        return Response({'next_tournament': next_tournament})
        
    except Exception as e:
        import traceback
        print(f"Dashboard next tournament error: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_profile(request):
    """Get dashboard profile information"""
    try:
        user = request.user
        
        profile_data = {
            'id': str(user.id),
            'full_name': user.full_name,
            'email': user.email,
            'role': user.role,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'bio': user.bio,
            'location': user.location,
            'skill_level': user.skill_level,
            'preferred_sports': user.preferred_sports,
            'matches_played': user.matches_played,
            'matches_won': user.matches_won,
            'win_rate': user.win_rate
        }
        
        return Response({'profile': profile_data})
        
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_player_stats(request, player_id=None):
    """Get comprehensive player statistics"""
    try:
        # Use provided player_id or current user's id
        target_player_id = player_id or str(request.user.id)
        sport_filter = request.GET.get('sport')  # Optional: 'FUTSAL', 'BADMINTON', or None
        
        stats = PlayerStatisticsService.get_player_stats(target_player_id, sport_filter)
        
        return Response({
            'success': True,
            'stats': stats
        })
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error getting player stats: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve player statistics'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sport_leaderboard(request):
    """Get leaderboard for a specific sport"""
    try:
        sport = request.GET.get('sport', 'FUTSAL').upper()
        category = request.GET.get('category', 'overall')
        limit = int(request.GET.get('limit', 50))
        
        if sport not in ['FUTSAL', 'BADMINTON']:
            return Response({
                'success': False,
                'error': 'Invalid sport. Must be FUTSAL or BADMINTON'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if category not in ['overall', 'goals', 'assists', 'wins', 'sets']:
            return Response({
                'success': False,
                'error': 'Invalid category'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        leaderboard = PlayerStatisticsService.get_sport_leaderboard(sport, category, limit)
        
        return Response({
            'success': True,
            'leaderboard': leaderboard,
            'sport': sport,
            'category': category
        })
    except Exception as e:
        print(f"Error getting sport leaderboard: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve leaderboard'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_player_rankings(request, player_id=None):
    """Get player rankings across all sports"""
    try:
        # Use provided player_id or current user's id
        target_player_id = player_id or str(request.user.id)
        
        rankings = {}
        for sport in ['FUTSAL', 'BADMINTON']:
            try:
                sport_ranking = PlayerStatisticsService.get_player_rankings(target_player_id, sport)
                if sport_ranking['ranking'] > 0:  # Only include if player has played this sport
                    rankings[sport] = sport_ranking
            except Exception as e:
                print(f"Error getting {sport} ranking for player {target_player_id}: {e}")
                continue
        
        return Response({
            'success': True,
            'rankings': rankings
        })
    except Exception as e:
        print(f"Error getting player rankings: {e}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve player rankings'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)