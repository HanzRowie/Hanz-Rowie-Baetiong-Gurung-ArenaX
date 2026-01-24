from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tournaments', views.TournamentViewSet)
router.register(r'registrations', views.TournamentRegistrationViewSet)
router.register(r'matches', views.MatchViewSet)
router.register(r'referee-bookings', views.RefereeBookingViewSet)

# URL patterns for tournaments app
urlpatterns = [
    # Specific patterns first (before router) - these must come before any router patterns
    path('create/', views.create_tournament, name='create_tournament'),
    path('my/', views.my_tournaments, name='my_tournaments'),
    path('my', views.my_tournaments, name='my_tournaments_no_slash'),  # Without trailing slash
    path('<uuid:tournament_id>/register/', views.register_for_tournament, name='register_tournament'),
    path('<uuid:tournament_id>/withdraw/', views.withdraw_from_tournament, name='withdraw_tournament'),
    path('<uuid:tournament_id>/participants/', views.tournament_participants, name='tournament_participants'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/accept/', views.accept_tournament_participant, name='accept_participant'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/reject/', views.reject_tournament_participant, name='reject_participant'),
    path('<uuid:tournament_id>/participants/bulk-accept/', views.bulk_accept_participants, name='bulk_accept_participants'),
    path('<uuid:tournament_id>/participants/bulk-reject/', views.bulk_reject_participants, name='bulk_reject_participants'),
    path('<uuid:tournament_id>/referees/', views.tournament_referees, name='tournament_referees'),
    path('<uuid:tournament_id>/participants/<uuid:participant_id>/', views.remove_tournament_participant, name='remove_tournament_participant'),
    path('<uuid:tournament_id>/referees/<uuid:referee_id>/', views.remove_tournament_referee, name='remove_tournament_referee'),
    
    # Router patterns last
    path('', include(router.urls)),
]
