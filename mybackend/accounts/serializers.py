from rest_framework import serializers
from .models import EmailVerification, PasswordResetToken

# Email Verification Serializer
class EmailVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailVerification
        fields = '__all__'

# Password Reset Token Serializer
class PasswordResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetToken
        fields = '__all__'
