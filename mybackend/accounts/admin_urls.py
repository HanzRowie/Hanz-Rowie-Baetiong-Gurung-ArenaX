from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_views import AdminUserViewSet

# Router for admin viewsets
# This will handle endpoints like:
# GET /api/admin/users/
# GET /api/admin/users/{pk}/
# PATCH /api/admin/users/{pk}/approve/
# etc.
router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
]
