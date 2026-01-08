from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from .utils import decode_jwt

def jwt_required(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return Response({"error":"Authorization header missing"},status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = auth_header.split(" ")[1]
            payload = decode_jwt(token)
            if not payload:
                return Response({"error":"Invalid or expired token"},status=status.HTTP_401_UNAUTHORIZED)
            request.user_id = payload['user_id']
            request.user_role = payload['role']
        except:
            return Response({"error":"Invalid token"},status=status.HTTP_401_UNAUTHORIZED)
        return view_func(request,*args,**kwargs)
    return wrapped

def role_required(allowed_roles):
    def decorator(view_func):
        @jwt_required
        @wraps(view_func)
        def wrapped(request,*args,**kwargs):
            if request.user_role not in allowed_roles:
                return Response({"error":"Permission denied"},status=status.HTTP_403_FORBIDDEN)
            return view_func(request,*args,**kwargs)
        return wrapped
    return decorator
