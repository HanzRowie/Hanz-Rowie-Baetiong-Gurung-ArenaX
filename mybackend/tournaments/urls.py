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
    # Specific patterns first (before router)
    path('tournaments/my/', views.my_tournaments, name='my_tournaments'),
    path('tournaments/my', views.my_tournaments, name='my_tournaments_no_slash'),  # Without trailing slash
    path('tournaments/create/', views.create_tournament, name='create_tournament'),
    path('tournaments/<uuid:tournament_id>/register/', views.register_for_tournament, name='register_tournament'),
    path('tournaments/<uuid:tournament_id>/withdraw/', views.withdraw_from_tournament, name='withdraw_tournament'),
    path('my/', views.my_tournaments, name='my_tournaments_short'),  # Alternative shorter URL
    path('my', views.my_tournaments, name='my_tournaments_short_no_slash'),  # Alternative shorter URL without slash
    # Router patterns last
    path('', include(router.urls)),
]
