from django.urls import path
from . import views

app_name = 'teams'

urlpatterns = [
    # Team CRUD endpoints
    path('create/', views.create_team, name='create_team'),  # POST
    path('', views.list_teams, name='list_teams'),    # GET
    path('<uuid:team_id>/', views.get_team, name='get_team'),  # GET
    path('<uuid:team_id>/update/', views.update_team, name='update_team'),  # PUT
    path('<uuid:team_id>/delete/', views.delete_team, name='delete_team'),  # DELETE
    
    # Team membership endpoints
    path('<uuid:team_id>/members/', views.get_team_members, name='get_team_members'),  # GET
    path('<uuid:team_id>/members/add/', views.add_team_member, name='add_team_member'),  # POST
    path('<uuid:team_id>/members/<uuid:player_id>/', views.get_member_details, name='get_member_details'),  # GET
    path('<uuid:team_id>/members/<uuid:player_id>/remove/', views.remove_team_member, name='remove_team_member'),  # DELETE
    path('<uuid:team_id>/members/<uuid:player_id>/role/', views.update_member_role, name='update_member_role'),  # PUT
    path('<uuid:team_id>/transfer-ownership/', views.transfer_ownership, name='transfer_ownership'),  # POST
    
    # Team invitation endpoints
    path('<uuid:team_id>/invitations/send/', views.send_invitation, name='send_invitation'),  # POST
    path('<uuid:team_id>/invitations/', views.list_team_invitations, name='list_team_invitations'),  # GET
    path('invitations/', views.list_player_invitations, name='list_player_invitations'),  # GET
    path('invitations/<uuid:invitation_id>/', views.get_invitation_details, name='get_invitation_details'),  # GET
    path('invitations/<uuid:invitation_id>/respond/', views.respond_to_invitation, name='respond_to_invitation'),  # POST
    path('invitations/<uuid:invitation_id>/cancel/', views.cancel_invitation, name='cancel_invitation'),  # DELETE
    
    # Activity History endpoints
    path('<uuid:team_id>/activity/', views.get_team_activity_history, name='team_activity_history'),
    path('<uuid:team_id>/activity/summary/', views.get_team_activity_summary, name='team_activity_summary'),
    path('<uuid:team_id>/activity/recent/', views.get_recent_team_activity, name='recent_team_activity'),
    path('<uuid:team_id>/activity/search/', views.search_team_activity, name='search_team_activity'),
    path('<uuid:team_id>/activity/timeline/', views.get_team_activity_timeline, name='team_activity_timeline'),
    path('<uuid:team_id>/activity/statistics/', views.get_team_activity_statistics, name='team_activity_statistics'),
    path('<uuid:team_id>/activity/export/', views.export_team_activity_history, name='export_team_activity_history'),
    
    # Match Scoring endpoints
    path('matches/<uuid:match_id>/score/futsal/', views.record_futsal_match_score, name='record_futsal_match_score'),  # POST
    path('matches/<uuid:match_id>/score/badminton/', views.record_badminton_match_score, name='record_badminton_match_score'),  # POST
    path('matches/<uuid:match_id>/score/update/', views.update_match_score, name='update_match_score'),  # PUT
    path('matches/<uuid:match_id>/', views.get_match_details, name='get_match_details'),  # GET
    path('matches/validate-score/', views.validate_match_score, name='validate_match_score'),  # POST
]