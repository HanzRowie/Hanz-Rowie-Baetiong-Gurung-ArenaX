from django.urls import path
from . import views

# URL patterns for accounts app
urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/refresh/', views.refresh_token, name='refresh_token'),
    path('auth/verify-email/', views.verify_email, name='verify_email'),
    path('auth/resend-verification/', views.resend_verification, name='resend_verification'),
    path('auth/forgot-password/', views.forgot_password, name='forgot_password'),
    path('auth/reset-password/', views.reset_password, name='reset_password'),
    path('auth/change-password/', views.change_password, name='change_password'),
    
    # Profile management endpoints
    path('users/me/', views.get_user_profile, name='get_user_profile'),
    path('users/profile', views.update_user_profile, name='update_profile'),
    path('users/profile/<uuid:user_id>', views.get_user_profile, name='get_user_profile_by_id'),
    path('users/profile/update/', views.update_user_profile, name='update_user_profile'),
    path('users/statistics/', views.get_user_statistics, name='get_user_statistics'),
    path('users/activity/', views.get_user_activity, name='get_user_activity'),
    path('users/achievements/', views.get_user_achievements, name='get_user_achievements'),
    path('users/connections/', views.get_user_connections, name='get_user_connections'),
    path('users/connections', views.get_user_connections, name='get_user_connections_no_slash'),
    path('users/recent-activity/', views.get_recent_activity, name='get_recent_activity'),
    path('users/<uuid:user_id>/send-request/', views.send_join_request, name='send_join_request'),
    path('users/<uuid:user_id>/send-request', views.send_join_request, name='send_join_request_no_slash'),
    path('join-requests/<int:request_id>/respond', views.respond_join_request, name='respond_join_request'),
    path('join-requests/<int:request_id>/respond/', views.respond_join_request, name='respond_join_request_slash'),
    path('users/search/', views.search_players, name='search_users'),
    path('players/search/', views.search_players, name='search_players'),
    path('join-requests/my/', views.get_my_join_requests, name='get_my_join_requests'),
    path('join-requests/my', views.get_my_join_requests, name='get_my_join_requests_no_slash'),
    path('users/<uuid:user_id>/online-status/', views.get_user_online_status, name='get_user_online_status'),
    
    # Dashboard endpoints (temporary - should be moved to separate app)
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('dashboard/monthly-stats/', views.dashboard_monthly_stats, name='dashboard_monthly_stats'),
    path('dashboard/next-tournament/', views.dashboard_next_tournament, name='dashboard_next_tournament'),
    path('dashboard/profile/', views.dashboard_profile, name='dashboard_profile'),
    
    # Admin endpoints
    path('admin/users/', views.admin_get_all_users, name='admin_get_all_users'),
    path('admin/users/<uuid:user_id>/', views.admin_get_user_details, name='admin_get_user_details'),
    path('admin/dashboard/', views.admin_dashboard_stats, name='admin_dashboard_stats'),
    
    # Player statistics and rankings endpoints
    path('players/stats/', views.get_player_stats, name='get_player_stats'),
    path('players/<uuid:player_id>/stats/', views.get_player_stats, name='get_player_stats_by_id'),
    path('players/leaderboard/', views.get_sport_leaderboard, name='get_sport_leaderboard'),
    path('players/rankings/', views.get_player_rankings, name='get_player_rankings'),
    path('players/<uuid:player_id>/rankings/', views.get_player_rankings, name='get_player_rankings_by_id'),
]
