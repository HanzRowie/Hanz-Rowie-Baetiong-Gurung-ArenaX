"""
WebSocket JWT Authentication Middleware
"""
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs

User = get_user_model()


from accounts.utils import decode_jwt

@database_sync_to_async
def get_user_from_token(token_string):
    """Get user from custom JWT token"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        payload = decode_jwt(token_string)
        logger.info(f"Decoded payload: {payload}")
        
        if payload is None:
            logger.warning("Payload is None - token decode failed")
            return None
            
        user_id = payload.get('user_id')
        logger.info(f"Extracted user_id: {user_id}")
        
        if not user_id:
            logger.warning("No user_id in payload")
            return None
            
        user = User.objects.get(id=user_id)
        logger.info(f"Found user: {user.full_name} ({user.email})")
        
        if not user.is_active:
            logger.warning(f"User {user.email} is not active")
            return None
            
        logger.info(f"Returning authenticated user: {user.full_name}")
        return user
    except User.DoesNotExist:
        logger.error(f"User with id {user_id} does not exist")
        return None
    except Exception as e:
        logger.error(f"Error in get_user_from_token: {str(e)}")
        return None


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes JWT token from query string and authenticates user
    """
    async def __call__(self, scope, receive, send):
        import logging
        logger = logging.getLogger(__name__)
        
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        logger.info(f"ws query_string: {query_string}")
        
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        logger.info(f"ws token: {token}")
        
        if token:
            user = await get_user_from_token(token)
            logger.info(f"ws authenticated user: {user.full_name if user else None}")
            scope['user'] = user
        else:
            logger.warning("No token provided in query string")
            scope['user'] = None
        
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Helper function to wrap URLRouter with JWT auth"""
    return JWTAuthMiddleware(inner)
