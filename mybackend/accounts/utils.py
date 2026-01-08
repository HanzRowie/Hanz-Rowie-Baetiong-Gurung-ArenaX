import jwt
import datetime
from django.conf import settings

def generate_access_token(user):
    """Generate short-lived access token (15 minutes)"""
    payload = {
        'user_id': str(user.id),
        'role': user.role,
        'token_type': 'access',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
        'iat': datetime.datetime.utcnow()
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token

def generate_refresh_token(user):
    """Generate long-lived refresh token (30 days)"""
    payload = {
        'user_id': str(user.id),
        'role': user.role,
        'token_type': 'refresh',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30),
        'iat': datetime.datetime.utcnow()
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token

def generate_jwt(user):
    """Legacy function - generates access token for backward compatibility"""
    return generate_access_token(user)

def decode_jwt(token):
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
