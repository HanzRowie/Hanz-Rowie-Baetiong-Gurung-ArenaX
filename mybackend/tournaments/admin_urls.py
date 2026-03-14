"""
Admin URLs for tournament management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_views import AdminTournamentViewSet

router = DefaultRouter()
router.register(r'tournaments', AdminTournamentViewSet, basename='admin-tournaments')

urlpatterns = [
    path('', include(router.urls)),
]
