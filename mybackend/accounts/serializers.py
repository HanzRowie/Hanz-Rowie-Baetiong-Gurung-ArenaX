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
    business_document_url = serializers.SerializerMethodField()
    certification_document_url = serializers.SerializerMethodField()
    venue_images_urls = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'full_name',
            'email',
            'role',
            'approval_status',
            'created_at',
            'verification_document_url',
            'business_document_url',
            'certification_document_url',
            'venue_images_urls'
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
    
    def get_business_document_url(self, obj):
        """Generate signed URL for business document (venue owners)"""
        if not obj.business_document:
            return None
        
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/business-document/?token={token}'
            )
        return None
    
    def get_certification_document_url(self, obj):
        """Generate signed URL for certification document (organizers/referees)"""
        if not obj.certification_document:
            return None
        
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/certification-document/?token={token}'
            )
        return None
    
    def get_venue_images_urls(self, obj):
        """Return list of venue image URLs"""
        if not obj.venue_images:
            return []
        
        request = self.context.get('request')
        if request and isinstance(obj.venue_images, list):
            # If venue_images contains relative paths, convert to absolute URLs
            return [
                request.build_absolute_uri(img) if not img.startswith('http') else img
                for img in obj.venue_images
            ]
        return obj.venue_images or []


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed user view with all profile fields.
    Used when viewing individual user details in admin dashboard.
    """
    verification_document_url = serializers.SerializerMethodField()
    business_document_url = serializers.SerializerMethodField()
    certification_document_url = serializers.SerializerMethodField()
    venue_images_urls = serializers.SerializerMethodField()
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
            'business_document_url',
            'certification_document_url',
            'venue_images_urls',
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
    
    def get_business_document_url(self, obj):
        """Generate signed URL for business document (venue owners)"""
        if not obj.business_document:
            return None
        
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/business-document/?token={token}'
            )
        return None
    
    def get_certification_document_url(self, obj):
        """Generate signed URL for certification document (organizers/referees)"""
        if not obj.certification_document:
            return None
        
        signer = TimestampSigner()
        token = signer.sign(str(obj.id))
        
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(
                f'/api/admin/users/{obj.id}/certification-document/?token={token}'
            )
        return None
    
    def get_venue_images_urls(self, obj):
        """Return list of venue image URLs"""
        if not obj.venue_images:
            return []
        
        request = self.context.get('request')
        if request and isinstance(obj.venue_images, list):
            # If venue_images contains relative paths, convert to absolute URLs
            return [
                request.build_absolute_uri(img) if not img.startswith('http') else img
                for img in obj.venue_images
            ]
        return obj.venue_images or []
    
    def get_recent_audit_logs(self, obj):
        """
        Get last 10 audit log entries for this user.
        Provides approval/rejection history.
        """
        logs = obj.audit_logs.all()[:10]
        return AuditLogSerializer(logs, many=True).data



class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with role-based document validation.
    Handles file uploads for official documents.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    business_document = serializers.FileField(required=False, allow_null=True)
    certification_document = serializers.FileField(required=False, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'email',
            'username',
            'full_name',
            'password',
            'phone_number',
            'role',
            'business_name',
            'business_registration',
            'business_contact',
            'business_document',
            'certification_document'
        ]
        extra_kwargs = {
            'username': {'required': False},
            'business_name': {'required': False},
            'business_registration': {'required': False},
            'business_contact': {'required': False},
        }
    
    def validate(self, data):
        """Role-based validation for documents"""
        role = data.get('role', 'PLAYER')
        
        # Prevent ADMIN role registration
        if role == 'ADMIN':
            raise serializers.ValidationError({
                'role': 'Cannot register as admin. Admin accounts must be created by system administrators.'
            })
        
        # Venue Owner validation
        if role == 'VENUE_OWNER':
            business_document = data.get('business_document')
            
            if not business_document:
                raise serializers.ValidationError({
                    'business_document': 'Business document (registration/license/certificate) is required for venue owners.'
                })
        
        # Organizer validation
        if role == 'ORGANIZER':
            certification_document = data.get('certification_document')
            if not certification_document:
                raise serializers.ValidationError({
                    'certification_document': 'Certification document is required for organizers.'
                })
        
        # Referee validation
        if role == 'REFEREE':
            certification_document = data.get('certification_document')
            if not certification_document:
                raise serializers.ValidationError({
                    'certification_document': 'Certification document is required for referees.'
                })
        
        return data
    
    def create(self, validated_data):
        """Create user with proper password hashing and file handling"""
        password = validated_data.pop('password')
        
        # Use email as username if not provided
        if 'username' not in validated_data or not validated_data['username']:
            validated_data['username'] = validated_data['email']
        
        # Create user
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user
