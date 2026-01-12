from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta

from accounts.decorators import jwt_required
from .models import OrganizerProfile, TournamentAnalytics, OrganizerNotification, OrganizerSubscription, TournamentTemplate
from .serializers import OrganizerProfileSerializer, TournamentAnalyticsSerializer, OrganizerNotificationSerializer, OrganizerSubscriptionSerializer, TournamentTemplateSerializer
from tournaments.models import Tournament, Match, TournamentRegistration
from accounts.models import CustomUser, PlayerStatistics

class OrganizerProfileViewSet(viewsets.ModelViewSet):
    queryset = OrganizerProfile.objects.all()
    serializer_class = OrganizerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizerProfile.objects.filter(user=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_dashboard(request):
    """Get comprehensive dashboard data for organizers"""
    user = request.user

    if user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can access this dashboard'}, status=status.HTTP_403_FORBIDDEN)

    # Tournament statistics
    total_tournaments = Tournament.objects.filter(organizer=user).count()
    active_tournaments = Tournament.objects.filter(organizer=user, status='ONGOING').count()
    upcoming_tournaments = Tournament.objects.filter(organizer=user, status='UPCOMING').count()
    completed_tournaments = Tournament.objects.filter(organizer=user, status='COMPLETED').count()

    # Revenue statistics
    from tournaments.models import TournamentRegistration
    total_revenue = TournamentRegistration.objects.filter(
        tournament__organizer=user,
        tournament__status='COMPLETED'
    ).aggregate(total=Sum('tournament__entry_fee'))['total'] or 0

    # Recent tournaments
    recent_tournaments = Tournament.objects.filter(organizer=user).order_by('-created_at')[:5]
    recent_tournaments_data = []
    for tournament in recent_tournaments:
        registrations_count = tournament.registrations.filter(status='ACCEPTED').count()
        recent_tournaments_data.append({
            'id': tournament.id,
            'title': tournament.title,
            'sport_type': tournament.sport_type,
            'date': tournament.date,
            'status': tournament.status,
            'registrations_count': registrations_count,
            'max_participants': tournament.max_participants
        })

    # Notifications
    unread_notifications = OrganizerNotification.objects.filter(
        organizer=user,
        read=False
    ).count()

    return Response({
        'statistics': {
            'total_tournaments': total_tournaments,
            'active_tournaments': active_tournaments,
            'upcoming_tournaments': upcoming_tournaments,
            'completed_tournaments': completed_tournaments,
            'total_revenue': float(total_revenue),
        },
        'recent_tournaments': recent_tournaments_data,
        'unread_notifications': unread_notifications,
    }, status=status.HTTP_200_OK)

class TournamentAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TournamentAnalytics.objects.all()
    serializer_class = TournamentAnalyticsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TournamentAnalytics.objects.filter(organizer=self.request.user)

class OrganizerNotificationViewSet(viewsets.ModelViewSet):
    queryset = OrganizerNotification.objects.all()
    serializer_class = OrganizerNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizerNotification.objects.filter(organizer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a specific notification as read"""
    notification = get_object_or_404(
        OrganizerNotification,
        id=notification_id,
        organizer=request.user
    )
    notification.read = True
    notification.save()

    return Response({'message': 'Notification marked as read'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the organizer"""
    OrganizerNotification.objects.filter(
        organizer=request.user,
        read=False
    ).update(read=True)

    return Response({'message': 'All notifications marked as read'}, status=status.HTTP_200_OK)

class OrganizerSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = OrganizerSubscription.objects.all()
    serializer_class = OrganizerSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizerSubscription.objects.filter(organizer=self.request.user)

class TournamentTemplateViewSet(viewsets.ModelViewSet):
    queryset = TournamentTemplate.objects.all()
    serializer_class = TournamentTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Return user's templates plus public templates from other organizers
        return TournamentTemplate.objects.filter(
            models.Q(organizer=self.request.user) | models.Q(is_public=True)
        )

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tournament_from_template(request, template_id):
    """Create a tournament from a template"""
    template = get_object_or_404(TournamentTemplate, id=template_id)

    # Check if user owns the template or it's public
    if template.organizer != request.user and not template.is_public:
        return Response({'error': 'You do not have access to this template'}, status=status.HTTP_403_FORBIDDEN)

    if request.user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can create tournaments'}, status=status.HTTP_403_FORBIDDEN)

    # Create tournament from template
    tournament = Tournament.objects.create(
        organizer=request.user,
        title=f"{template.name} Tournament",
        description=template.description,
        sport_type=template.sport_type,
        tournament_type=template.tournament_type,
        max_participants=template.default_max_participants,
        entry_fee=template.default_entry_fee,
        rules=template.default_rules,
        # Set default dates (should be updated by user)
        date=timezone.now().date() + timedelta(days=30),
        start_time='10:00:00',
        registration_deadline=timezone.now() + timedelta(days=25)
    )

    # Increment template usage count
    template.usage_count += 1
    template.save()

    from tournaments.serializers import TournamentSerializer
    serializer = TournamentSerializer(tournament)

    return Response({
        'message': 'Tournament created from template',
        'tournament': serializer.data
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def organizer_analytics(request):
    """Get detailed analytics for organizer"""
    user = request.user

    if user.role != 'ORGANIZER':
        return Response({'error': 'Only organizers can access analytics'}, status=status.HTTP_403_FORBIDDEN)

    # Tournament performance
    tournaments = Tournament.objects.filter(organizer=user)
    total_tournaments = tournaments.count()

    if total_tournaments == 0:
        return Response({
            'message': 'No tournaments found for analytics',
            'analytics': {
                'total_tournaments': 0,
                'total_registrations': 0,
                'total_revenue': 0,
                'average_participants': 0,
                'completion_rate': 0,
            }
        }, status=status.HTTP_200_OK)

    # Aggregate analytics
    analytics = tournaments.aggregate(
        total_registrations=Count('registrations'),
        total_revenue=Sum('entry_fee'),
        avg_participants=Avg('registrations__count')
    )

    # Completion rate (tournaments with status COMPLETED)
    completed_count = tournaments.filter(status='COMPLETED').count()
    completion_rate = (completed_count / total_tournaments) * 100 if total_tournaments > 0 else 0

    return Response({
        'analytics': {
            'total_tournaments': total_tournaments,
            'total_registrations': analytics['total_registrations'] or 0,
            'total_revenue': float(analytics['total_revenue'] or 0),
            'average_participants': analytics['avg_participants'] or 0,
            'completion_rate': round(completion_rate, 2),
        }
    }, status=status.HTTP_200_OK)

# Dashboard views from core/dashboard_views.py
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for the current user"""
    user = request.user

    if user.role == 'PLAYER':
        # Player statistics
        upcoming_matches = Match.objects.filter(
            Q(player1=user) | Q(player2=user),
            status='SCHEDULED',
            scheduled_time__gte=timezone.now()
        ).count()

        total_tournaments = TournamentRegistration.objects.filter(
            player=user,
            status='ACCEPTED'
        ).count()

        stats = {
            'upcomingMatches': upcoming_matches,
            'totalTournaments': total_tournaments,
            'totalParticipants': 0,  # Not applicable for players
            'winRate': user.win_rate,
            'matchesWon': user.matches_won,
            'matchesPlayed': user.matches_played,
        }

    elif user.role == 'ORGANIZER':
        # Organizer statistics
        my_tournaments = Tournament.objects.filter(organizer=user)
        total_participants = TournamentRegistration.objects.filter(
            tournament__organizer=user,
            status='ACCEPTED'
        ).count()

        upcoming_events = my_tournaments.filter(status='UPCOMING').count()
        completed_events = my_tournaments.filter(status='COMPLETED').count()

        stats = {
            'upcomingMatches': 0,  # Not applicable for organizers
            'totalTournaments': my_tournaments.count(),
            'totalParticipants': total_participants,
            'winRate': 0,  # Not applicable for organizers
            'matchesWon': 0,
            'matchesPlayed': 0,
            'upcomingEvents': upcoming_events,
            'completedEvents': completed_events,
        }

    else:
        # Default stats for other roles
        stats = {
            'upcomingMatches': 0,
            'totalTournaments': 0,
            'totalParticipants': 0,
            'winRate': 0,
            'matchesWon': 0,
            'matchesPlayed': 0,
        }

    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_stats(request):
    """Get monthly statistics for the current user"""
    user = request.user
    year = int(request.GET.get('year', timezone.now().year))

    if user.role != 'PLAYER':
        return Response([])

    # Get monthly stats for the player
    monthly_data = []
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for month_num in range(1, 13):
        try:
            stat = PlayerStatistics.objects.get(
                player=user,
                year=year,
                month=month_num
            )
            monthly_data.append({
                'month': months[month_num - 1],
                'wins': stat.matches_won,
                'losses': stat.matches_played - stat.matches_won,
                'tournaments': stat.tournaments_participated,
            })
        except PlayerStatistics.DoesNotExist:
            monthly_data.append({
                'month': months[month_num - 1],
                'wins': 0,
                'losses': 0,
                'tournaments': 0,
            })

    return Response(monthly_data)

def get_user_profile_data(user):
    """Get user profile data for dashboard (works for all user roles) - helper function"""
    # Base profile data for all users
    profile_data = {
        'id': str(user.id),
        'full_name': user.full_name,
        'email': user.email,
        'role': user.role,
        'phone_number': user.phone_number,
        'bio': user.bio,
        'location': user.location,
        'country': user.country,
        'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
        'gender': user.gender,
        'preferred_sports': user.preferred_sports,
        'skill_level': user.skill_level,
        'achievements': user.achievements,
        'social_links': user.social_links,
        'is_available_for_matches': user.is_available_for_matches,
        'profile_picture': user.profile_picture.url if user.profile_picture else None,
        'created_at': user.created_at.isoformat(),
        'is_verified': user.is_verified,
    }

    # Role-specific data
    if user.role == 'PLAYER':
        # Player-specific statistics
        total_tournaments = TournamentRegistration.objects.filter(
            player=user, status='ACCEPTED'
        ).count()

        upcoming_matches = Match.objects.filter(
            Q(player1=user) | Q(player2=user),
            status='SCHEDULED',
            scheduled_time__gte=timezone.now()
        ).count()

        profile_data.update({
            'total_tournaments': total_tournaments,
            'upcoming_matches': upcoming_matches,
            'win_rate': user.win_rate or 0,
            'matches_won': user.matches_won or 0,
            'matches_played': user.matches_played or 0,
            'wta_ranking': user.wta_ranking,
            'atp_ranking': user.atp_ranking,
        })

    elif user.role == 'ORGANIZER':
        # Organizer-specific statistics
        organized_tournaments = Tournament.objects.filter(organizer=user)
        total_participants = TournamentRegistration.objects.filter(
            tournament__organizer=user,
            status='ACCEPTED'
        ).count()

        total_revenue = TournamentRegistration.objects.filter(
            tournament__organizer=user,
            tournament__status='COMPLETED',
            status='ACCEPTED'
        ).aggregate(total=Sum('tournament__entry_fee'))['total'] or 0

        profile_data.update({
            'total_tournaments_organized': organized_tournaments.count(),
            'total_participants': total_participants,
            'total_revenue': float(total_revenue),
            'active_tournaments': organized_tournaments.filter(status='ONGOING').count(),
            'upcoming_tournaments': organized_tournaments.filter(status='UPCOMING').count(),
        })

    elif user.role == 'REFEREE':
        # Referee-specific statistics
        from tournaments.models import RefereeBooking
        total_bookings = RefereeBooking.objects.filter(referee=user).count()
        completed_bookings = RefereeBooking.objects.filter(
            referee=user,
            status='COMPLETED'
        ).count()

        profile_data.update({
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'completion_rate': (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0,
        })

    elif user.role == 'VENUE_OWNER':
        # Venue owner-specific statistics
        from venues.models import Venue, VenueBooking
        owned_venues = Venue.objects.filter(owner=user)
        total_bookings = VenueBooking.objects.filter(venue__owner=user).count()

        profile_data.update({
            'total_venues': owned_venues.count(),
            'total_bookings': total_bookings,
        })

    return profile_data

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get user profile data for dashboard (works for all user roles)"""
    user = request.user
    profile_data = get_user_profile_data(user)
    return Response(profile_data)

# Keep the old player_profile function for backward compatibility
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def player_profile(request):
    """Get player profile data for dashboard (deprecated - use user_profile instead)"""
    user = request.user
    profile_data = get_user_profile_data(user)
    return Response(profile_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def next_tournament(request):
    """Get next upcoming tournament for the player"""
    user = request.user

    if user.role != 'PLAYER':
        return Response({"error": "This endpoint is for players only"}, status=status.HTTP_403_FORBIDDEN)

    # Find next tournament the player is registered for
    next_registration = TournamentRegistration.objects.filter(
        player=user,
        status='ACCEPTED',
        tournament__status='UPCOMING',
        tournament__date__gte=timezone.now().date()
    ).select_related('tournament').order_by('tournament__date').first()

    if not next_registration:
        return Response({"message": "No upcoming tournaments found"})

    tournament = next_registration.tournament
    tournament_data = {
        'id': str(tournament.id),
        'title': tournament.title,
        'sport_type': tournament.sport_type,
        'date': tournament.date.isoformat(),
        'start_time': str(tournament.start_time),
        'venue': tournament.venue,
        'entry_fee': float(tournament.entry_fee),
        'max_participants': tournament.max_participants,
        'registered_count': tournament.registered_count,
    }

    return Response(tournament_data)
