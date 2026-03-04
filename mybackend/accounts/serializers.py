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

# Admin Control System Serializers
from django.core.signing import TimestampSigner
from .models import CustomUser, AdminAuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit log entries.
    Displays administrator actions with relevant details.
    """
    administrator_name = serializers.CharField(
        source='administrator.full_name',
        read_only=True
    )
    
    class Meta:
        model = AdminAuditLog
        fields = [
            'id',
            'action_type',
            'administrator_name',
            'rejection_reason',
            'timestamp'
        ]
        read_only_fields = fields


class AdminUserListSerializer(serializers.ModelSerializer):
    """
    Serializer for user list view with essential fields.
    Used in admin dashboard for displaying paginated user lists.
    """
    verification_document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'full_name',
            'email',
            'role',
            'approval_status',
            'created_at',
            'verification_document_url'
        ]
        read_only_fields = fields
    
    def get_verification_document_url(self, obj):
        """
        Generate time-limited signed URL for document access.
        Returns None if no document is uploaded.
        Signature is valid for 1 hour.
        """
        if not obj.verification_document:
            return None
        
        # Generate signed URL valid for 1 hour
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/document/?token={token}'
            )
        return None


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed user view with all profile fields.
    Used when viewing individual user details in admin dashboard.
    """
    verification_document_url = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(
        source='approved_by.full_name',
        read_only=True,
        allow_null=True
    )
    recent_audit_logs = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'full_name',
            'email',
            'phone_number',
            'role',
            'approval_status',
            'approval_date',
            'approved_by_name',
            'rejection_reason',
            'verification_document_url',
            'bio',
            'date_of_birth',
            'location',
            'country',
            'business_name',
            'business_registration',
            'created_at',
            'updated_at',
            'recent_audit_logs'
        ]
        read_only_fields = fields
    
    def get_verification_document_url(self, obj):
        """
        Generate time-limited signed URL for document access.
        Returns None if no document is uploaded.
        Signature is valid for 1 hour.
        """
        if not obj.verification_document:
            return None
        
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/document/?token={token}'
            )
        return None
    
    def get_recent_audit_logs(self, obj):
        """
        Get last 10 audit log entries for this user.
        Provides approval/rejection history.
        """
        logs = obj.audit_logs.all()[:10]
        return AuditLogSerializer(logs, many=True).data
