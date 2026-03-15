from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.RefereeProfileViewSet)
router.register(r'availability', views.RefereeAvailabilityViewSet)
router.register(r'general-availability', views.RefereeGeneralAvailabilityViewSet)
router.register(r'bookings', views.RefereeBookingViewSet)
router.register(r'ratings', views.RefereeRatingViewSet)
router.register(r'certifications', views.RefereeCertificationViewSet)
router.register(r'match-reports', views.RefereeMatchReportViewSet)

# URL patterns for referees app
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.referee_dashboard, name='referee_dashboard'),
    path('find-available/', views.find_available_referees, name='find_available_referees'),
    path('bookings/<int:booking_id>/respond/', views.respond_to_booking_request, name='respond_to_booking_request'),
    path('request-booking/<int:referee_id>/<int:match_id>/', views.request_referee_booking, name='request_referee_booking'),
    
    # New tournament-specific endpoints
    path('tournament/<uuid:tournament_id>/available/', views.available_referees_for_tournament, name='available_referees_for_tournament'),
    path('tournament/<uuid:tournament_id>/assign/', views.assign_referee_to_tournament, name='assign_referee_to_tournament'),
    
    # Payment-related endpoints
    path('bookings/<int:booking_id>/complete/', views.complete_match_and_release_payment, name='complete_match_and_release_payment'),
    path('earnings/', views.referee_earnings, name='referee_earnings'),
]
