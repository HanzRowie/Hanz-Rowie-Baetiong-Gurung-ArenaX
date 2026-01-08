from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from .utils import decode_jwt

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    """Custom JWT Authentication for Django REST Framework"""

    def authenticate(self, request):
        # Get the authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None  # No authentication attempted

        # Check if it's a Bearer token
        if not auth_header.startswith('Bearer '):
            return None  # Not our authentication method

        # Extract the token
        token = auth_header.split(' ')[1]

        if not token:
            return None  # Invalid token format, let other auth methods handle it

        # Decode the token
        payload = decode_jwt(token)

        if payload is None:
            return None  # Invalid or expired token, let it proceed without auth for AllowAny endpoints

        # Get the user
        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            return None  # User not found, let it proceed without auth

        # Check if user is active
        if not user.is_active:
            return None  # User account disabled, let it proceed without auth

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'
