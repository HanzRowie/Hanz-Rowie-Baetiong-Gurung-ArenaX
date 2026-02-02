from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import dashboard_views

router = DefaultRouter()
router.register(r'profiles', views.OrganizerProfileViewSet)
router.register(r'analytics', views.TournamentAnalyticsViewSet)
router.register(r'notifications', views.OrganizerNotificationViewSet)
router.register(r'subscriptions', views.OrganizerSubscriptionViewSet)
router.register(r'templates', views.TournamentTemplateViewSet)

# URL patterns for organizers app
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.organizer_dashboard, name='organizer_dashboard'),
    path('analytics/', views.organizer_analytics, name='organizer_analytics'),
    path('notifications/<int:notification_id>/mark-read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('templates/<int:template_id>/create-tournament/', views.create_tournament_from_template, name='create_tournament_from_template'),
    # Dashboard views from core/dashboard_views.py
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('dashboard/monthly-stats/', views.monthly_stats, name='monthly_stats'),
    path('dashboard/profile/', views.player_profile, name='player_profile'),
    path('dashboard/next-tournament/', views.next_tournament, name='next_tournament'),
    
    # New organizer dashboard endpoints
    path('dashboard/organizer-stats/', dashboard_views.organizer_dashboard_stats, name='organizer_dashboard_stats'),
    path('dashboard/recent-matches/', dashboard_views.recent_matches, name='recent_matches'),
    path('dashboard/recent-activity/', dashboard_views.recent_activity, name='recent_activity'),
    path('dashboard/match-reports/', dashboard_views.match_reports, name='match_reports'),
    path('dashboard/match-reports/<uuid:tournament_id>/download/', dashboard_views.download_match_report, name='download_match_report'),
    path('dashboard/match-reports/download-all/', dashboard_views.download_all_match_reports, name='download_all_match_reports'),
]
