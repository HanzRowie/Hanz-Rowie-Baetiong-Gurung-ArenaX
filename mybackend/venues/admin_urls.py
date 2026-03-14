"""
Admin URLs for venue management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_views import AdminVenueViewSet

router = DefaultRouter()
router.register(r'venues', AdminVenueViewSet, basename='admin-venues')

urlpatterns = [
    path('', include(router.urls)),
]
