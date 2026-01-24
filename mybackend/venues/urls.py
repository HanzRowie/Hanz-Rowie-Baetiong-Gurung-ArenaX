from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'venues', views.VenueViewSet)
router.register(r'availabilities', views.VenueAvailabilityViewSet)
router.register(r'bookings', views.VenueBookingViewSet)

# URL patterns for venues app
urlpatterns = [
    path('', include(router.urls)),
    path('venues/<int:venue_id>/book/', views.book_venue, name='book_venue'),
    path('bookings/<int:booking_id>/cancel/', views.cancel_booking, name='cancel_booking'),
    path('bookings/<int:booking_id>/approve/', views.approve_booking, name='approve_booking'),
    path('bookings/<int:booking_id>/reject/', views.reject_booking, name='reject_booking'),
    path('venues/<int:venue_id>/availability/', views.venue_availability, name='venue_availability'),
    path('available-venues/', views.available_venues_for_tournament, name='available_venues_for_tournament'),
    path('my-bookings/', views.my_venue_bookings, name='my_venue_bookings'),
    path('my-venues/', views.get_my_venues, name='get_my_venues'),
    path('venues/<int:venue_id>/stats/', views.venue_stats, name='venue_stats'),
    path('venues/<int:venue_id>/reviews/', views.venue_reviews, name='venue_reviews'),
    path('earnings/', views.venue_earnings, name='venue_earnings'),
]
