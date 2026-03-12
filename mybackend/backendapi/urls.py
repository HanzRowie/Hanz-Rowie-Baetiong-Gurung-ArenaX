from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# API root functions
def api_home(request):
    from django.http import JsonResponse
    return JsonResponse({"message": "API is running!"})

def root(request):
    from django.http import JsonResponse
    return JsonResponse({"message": "Welcome to the backend API root!"})

urlpatterns = [
    path('', root),
    path('admin/', admin.site.urls),
    path('api/', api_home),

    # Include URLs from all apps
    path('api/accounts/', include('accounts.urls')),
    path('api/admin/', include('accounts.admin_urls')),
    path('api/tournaments/', include('tournaments.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/organizers/', include('organizers.urls')),
    path('api/referees/', include('referees.urls')),
    path('api/venues/', include('venues.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/teams/', include('teams.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
