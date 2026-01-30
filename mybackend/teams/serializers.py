from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Team, TeamMembership, Invitation, ActivityHistory

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for team-related responses"""
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email']
        read_only_fields = ['id', 'full_name', 'email']


class TeamMembershipSerializer(serializers.ModelSerializer):
    """Serializer for team membership information"""
    player = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = TeamMembership
        fields = ['id', 'player', 'role', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for team information"""
    owner = UserBasicSerializer(read_only=True)
    memberships = TeamMembershipSerializer(many=True, read_only=True)
    member_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'sport_types', 'owner', 'created_at', 'updated_at',
            'max_size', 'is_active', 'memberships', 'member_count', 'is_full'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at', 'is_active']

    def validate_sport_types(self, value):
        """Validate sport types"""
        valid_sports = ['FUTSAL', 'BADMINTON']
        if not value:
            raise serializers.ValidationError("At least one sport type is required")
        
        invalid_sports = [sport for sport in value if sport not in valid_sports]
        if invalid_sports:
            raise serializers.ValidationError(f"Invalid sport types: {invalid_sports}")
        
        return value

    def validate_name(self, value):
        """Validate team name uniqueness"""
        if not value or not value.strip():
            raise serializers.ValidationError("Team name cannot be empty")
        
        # Check for uniqueness during creation
        if not self.instance:  # Creating new team
            if Team.objects.filter(name=value.strip(), is_active=True).exists():
                raise serializers.ValidationError("Team with this name already exists")
        else:  # Updating existing team
            if Team.objects.filter(name=value.strip(), is_active=True).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Team with this name already exists")
        
        return value.strip()

    def validate_max_size(self, value):
        """Validate max size"""
        if value < 1:
            raise serializers.ValidationError("Maximum size must be at least 1")
        if value > 50:  # Reasonable upper limit
            raise serializers.ValidationError("Maximum size cannot exceed 50")
        return value


class TeamCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating teams"""
    class Meta:
        model = Team
        fields = ['name', 'sport_types', 'max_size']

    def validate_sport_types(self, value):
        """Validate sport types"""
        valid_sports = ['FUTSAL', 'BADMINTON']
        if not value:
            raise serializers.ValidationError("At least one sport type is required")
        
        invalid_sports = [sport for sport in value if sport not in valid_sports]
        if invalid_sports:
            raise serializers.ValidationError(f"Invalid sport types: {invalid_sports}")
        
        return value

    def validate_name(self, value):
        """Validate team name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Team name cannot be empty")
        
        if Team.objects.filter(name=value.strip(), is_active=True).exists():
            raise serializers.ValidationError("Team with this name already exists")
        
        return value.strip()

    def validate_max_size(self, value):
        """Validate max size"""
        if value and value < 1:
            raise serializers.ValidationError("Maximum size must be at least 1")
        if value and value > 50:
            raise serializers.ValidationError("Maximum size cannot exceed 50")
        return value or 15  # Default to 15 if not provided


class TeamUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating teams"""
    class Meta:
        model = Team
        fields = ['name', 'sport_types', 'max_size']

    def validate_sport_types(self, value):
        """Validate sport types"""
        if value is not None:  # Allow None to skip validation if not updating
            valid_sports = ['FUTSAL', 'BADMINTON']
            if not value:
                raise serializers.ValidationError("At least one sport type is required")
            
            invalid_sports = [sport for sport in value if sport not in valid_sports]
            if invalid_sports:
                raise serializers.ValidationError(f"Invalid sport types: {invalid_sports}")
        
        return value

    def validate_name(self, value):
        """Validate team name uniqueness"""
        if value is not None:  # Allow None to skip validation if not updating
            if not value.strip():
                raise serializers.ValidationError("Team name cannot be empty")
            
            # Check for uniqueness excluding current team
            if Team.objects.filter(name=value.strip(), is_active=True).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Team with this name already exists")
        
        return value.strip() if value else value

    def validate_max_size(self, value):
        """Validate max size"""
        if value is not None:  # Allow None to skip validation if not updating
            if value < 1:
                raise serializers.ValidationError("Maximum size must be at least 1")
            if value > 50:
                raise serializers.ValidationError("Maximum size cannot exceed 50")
            
            # Check if reducing size would make team over capacity
            if self.instance and value < self.instance.member_count:
                raise serializers.ValidationError(
                    f"Cannot reduce max size to {value}. Team currently has {self.instance.member_count} members."
                )
        
        return value


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for team invitations"""
    team = TeamSerializer(read_only=True)
    player = UserBasicSerializer(read_only=True)
    sender = UserBasicSerializer(read_only=True)
    is_expired = serializers.ReadOnlyField()
    can_respond = serializers.ReadOnlyField()
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'team', 'player', 'sender', 'status', 'sent_at', 
            'responded_at', 'expires_at', 'is_expired', 'can_respond'
        ]
        read_only_fields = [
            'id', 'team', 'player', 'sender', 'sent_at', 
            'responded_at', 'expires_at', 'is_expired', 'can_respond'
        ]


class InvitationCreateSerializer(serializers.Serializer):
    """Serializer for creating team invitations"""
    player_id = serializers.UUIDField()
    
    def validate_player_id(self, value):
        """Validate that player exists and is a player"""
        try:
            player = User.objects.get(id=value, role='PLAYER')
        except User.DoesNotExist:
            raise serializers.ValidationError("Player not found or not a player")
        return value


class InvitationResponseSerializer(serializers.Serializer):
    """Serializer for responding to invitations"""
    response = serializers.ChoiceField(choices=['ACCEPTED', 'DECLINED'])


class ActivityHistorySerializer(serializers.ModelSerializer):
    """Serializer for team activity history"""
    performed_by = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = ActivityHistory
        fields = [
            'id', 'event_type', 'description', 'performed_by', 
            'timestamp', 'metadata'
        ]
        read_only_fields = [
            'id', 'event_type', 'description', 'performed_by', 
            'timestamp', 'metadata'
        ]


class TeamMemberAddSerializer(serializers.Serializer):
    """Serializer for adding team members"""
    player_id = serializers.UUIDField()
    
    def validate_player_id(self, value):
        """Validate that player exists and is a player"""
        try:
            player = User.objects.get(id=value, role='PLAYER')
        except User.DoesNotExist:
            raise serializers.ValidationError("Player not found or not a player")
        return value


class TeamMemberRoleUpdateSerializer(serializers.Serializer):
    """Serializer for updating team member roles"""
    role = serializers.ChoiceField(choices=['LEADER', 'MEMBER'])
    
    def validate_role(self, value):
        """Validate role assignment"""
        if value not in ['LEADER', 'MEMBER']:
            raise serializers.ValidationError("Role must be 'LEADER' or 'MEMBER'")
        return value


class OwnershipTransferSerializer(serializers.Serializer):
    """Serializer for transferring team ownership"""
    new_owner_id = serializers.UUIDField()
    
    def validate_new_owner_id(self, value):
        """Validate that new owner exists and is a player"""
        try:
            player = User.objects.get(id=value, role='PLAYER')
        except User.DoesNotExist:
            raise serializers.ValidationError("Player not found or not a player")
        return value


class TeamListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for team lists"""
    owner = UserBasicSerializer(read_only=True)
    memberships = TeamMembershipSerializer(many=True, read_only=True)
    member_count = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    
    class Meta:
        model = Team
        fields = [
            'id', 'name', 'sport_types', 'owner', 'created_at', 
            'member_count', 'max_size', 'is_active', 'memberships', 'is_full'
        ]
        read_only_fields = [
            'id', 'owner', 'created_at', 'member_count', 'is_active', 'is_full'
        ]