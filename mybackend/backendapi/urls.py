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
    path('api/', include('accounts.urls')),
    path('api/', include('tournaments.urls')),
    path('api/', include('chat.urls')),
    path('api/', include('organizers.urls')),
    path('api/', include('venues.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
