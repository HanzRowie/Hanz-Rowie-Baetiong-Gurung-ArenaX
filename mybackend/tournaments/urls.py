from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import futsal_scoring_views
from .admin_views import AdminTournamentViewSet
from .match_events_views import MatchEventViewSet
from . import remarks_views
from .document_views import upload_tournament_documents, get_tournament_document_status

router = DefaultRouter()
router.register(r'tournaments', views.TournamentViewSet)
router.register(r'registrations', views.TournamentRegistrationViewSet)
router.register(r'matches', views.MatchViewSet)
router.register(r'match-events', MatchEventViewSet, basename='match-events')
router.register(r'referee-bookings', views.RefereeBookingViewSet)
router.register(r'tournament-referee-availability', views.TournamentRefereeAvailabilityViewSet, basename='tournament-referee-availability')
router.register(r'player-stats', views.PlayerStatsViewSet, basename='player-stats')
router.register(r'admin/tournaments', AdminTournamentViewSet, basename='admin-tournament')

# URL patterns for tournaments app
urlpatterns = [
    # Public shareable link (no auth required)
    path('public/<uuid:share_token>/', views.public_tournament_detail, name='public_tournament_detail'),

    # Specific patterns first (before router) - these must come before any router patterns
    path('create/', views.create_tournament, name='create_tournament'),
    path('my/', views.my_tournaments, name='my_tournaments'),
    path('my', views.my_tournaments, name='my_tournaments_no_slash'),  # Without trailing slash
    path('<uuid:tournament_id>/generate-bracket/', views.generate_tournament_bracket, name='generate_tournament_bracket'),
    path('<uuid:tournament_id>/register/', views.register_for_tournament, name='register_tournament'),
    path('<uuid:tournament_id>/register-with-payment/', views.register_with_payment, name='register_with_payment'),
    path('<uuid:tournament_id>/register-team/', views.register_team_for_tournament, name='register_team_tournament'),
    path('<uuid:tournament_id>/register-team-with-payment/', views.register_team_with_payment, name='register_team_with_payment'),
    path('<uuid:tournament_id>/withdraw/', views.withdraw_from_tournament, name='withdraw_tournament'),
    path('<uuid:tournament_id>/verify-venue-payment/', views.verify_tournament_venue_payment, name='verify_tournament_venue_payment'),
    path('<uuid:tournament_id>/participants/', views.tournament_participants, name='tournament_participants'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/accept/', views.accept_tournament_participant, name='accept_participant'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/reject/', views.reject_tournament_participant, name='reject_participant'),
    path('<uuid:tournament_id>/matches/', views.tournament_matches, name='tournament_matches'),
    path('<uuid:tournament_id>/matches/<uuid:match_id>/result/', views.update_match_result, name='update_match_result'),
    path('<uuid:tournament_id>/team-participants/<uuid:registration_id>/accept/', views.accept_team_participant, name='accept_team_participant'),
    path('<uuid:tournament_id>/team-participants/<uuid:registration_id>/reject/', views.reject_team_participant, name='reject_team_participant'),
    path('<uuid:tournament_id>/participants/bulk-accept/', views.bulk_accept_participants, name='bulk_accept_participants'),
    path('<uuid:tournament_id>/participants/bulk-reject/', views.bulk_reject_participants, name='bulk_reject_participants'),
    path('<uuid:tournament_id>/referees/', views.tournament_referees, name='tournament_referees'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/', views.remove_tournament_participant, name='remove_tournament_participant'),
    path('<uuid:tournament_id>/referees/<int:referee_id>/', views.remove_tournament_referee, name='remove_tournament_referee'),
    path('teams/<uuid:team_id>/available/', views.team_available_tournaments, name='team_available_tournaments'),
    path('<uuid:tournament_id>/registered-players/', views.tournament_registered_players, name='tournament_registered_players'),
    
    # Futsal scoring endpoints
    path('<uuid:tournament_id>/matches/<uuid:match_id>/futsal-score/', futsal_scoring_views.record_futsal_match_score, name='record_futsal_score'),
    path('<uuid:tournament_id>/matches/<uuid:match_id>/details/', futsal_scoring_views.get_match_details, name='match_details'),

    # Match remarks endpoints
    path('<uuid:tournament_id>/matches/<uuid:match_id>/remarks/', remarks_views.match_remarks, name='match_remarks'),
    path('<uuid:tournament_id>/matches/<uuid:match_id>/remarks/<uuid:remark_id>/', remarks_views.match_remark_detail, name='match_remark_detail'),
    path('remarks/options/', remarks_views.remark_options, name='remark_options'),
    
    # Router patterns last
    path('', include(router.urls)),
    path('<uuid:tournament_id>/complete/', views.complete_tournament, name='complete_tournament'),
    path('<uuid:tournament_id>/upload-documents/', upload_tournament_documents, name='upload_tournament_documents'),
    path('<uuid:tournament_id>/document-status/', get_tournament_document_status, name='tournament_document_status'),
]
