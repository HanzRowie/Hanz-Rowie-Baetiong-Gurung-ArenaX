from rest_framework import serializers
from .models import OrganizerProfile, TournamentAnalytics, OrganizerNotification, OrganizerSubscription, TournamentTemplate

class OrganizerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerProfile
        fields = '__all__'

class TournamentAnalyticsSerializer(serializers.ModelSerializer):
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)

    class Meta:
        model = TournamentAnalytics
        fields = '__all__'

class OrganizerNotificationSerializer(serializers.ModelSerializer):
    tournament_title = serializers.CharField(source='tournament.title', read_only=True)

    class Meta:
        model = OrganizerNotification
        fields = '__all__'

class OrganizerSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizerSubscription
        fields = '__all__'

class TournamentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentTemplate
        fields = '__all__'
