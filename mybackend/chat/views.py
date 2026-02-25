from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Message, ChatMessage, RefereeOrganizerRelationship, GroupChat, GroupMessage, GroupMessageReadReceipt
from .serializers import MessageSerializer, ChatMessageSerializer
from teams.models import TeamMembership

# Role Compatibility Matrix
ROLE_CHAT_PERMISSIONS = {
    'PLAYER': ['PLAYER', 'ORGANIZER', 'VENUE_OWNER'],
    'ORGANIZER': ['PLAYER', 'ORGANIZER', 'VENUE_OWNER', 'REFEREE'],
    'VENUE_OWNER': ['PLAYER', 'ORGANIZER', 'VENUE_OWNER'],
    'REFEREE': ['ORGANIZER'],  # Only with relationship
    'ADMIN': ['PLAYER', 'ORGANIZER', 'VENUE_OWNER', 'REFEREE', 'ADMIN'],
}

def can_chat_with(user1, user2):
    """
    Check if two users can chat based on role compatibility.
    
    Args:
        user1: The first user (typically the requesting user)
        user2: The second user (typically the target user)
    
    Returns:
        bool: True if users can chat, False otherwise
    """
    # Check basic role compatibility
    if user2.role not in ROLE_CHAT_PERMISSIONS.get(user1.role, []):
        return False
    
    # Special case: Referee can only chat with organizers who have a relationship
    if user1.role == 'REFEREE' and user2.role == 'ORGANIZER':
        return RefereeOrganizerRelationship.objects.filter(
            referee=user1, organizer=user2
        ).exists()
    
    if user2.role == 'REFEREE' and user1.role == 'ORGANIZER':
        return RefereeOrganizerRelationship.objects.filter(
            referee=user2, organizer=user1
        ).exists()
    
    return True

def can_access_group_chat(user, team):
    """
    Check if user can access team group chat.
    
    Args:
        user: The user attempting to access the group chat
        team: The team whose group chat is being accessed
    
    Returns:
        bool: True if user is an active team member, False otherwise
    """
    return TeamMembership.objects.filter(
        team=team,
        player=user,
        is_active=True
    ).exists()

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().order_by('-timestamp')
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).order_by('-timestamp')

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all().order_by('-timestamp')
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.all().order_by('-timestamp')

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_messages(request):
    """
    GET: Get messages for a conversation.
    Query params: other_user_id, page, page_size
    Returns paginated messages in chronological order.
    Verifies user is participant.
    
    POST: Send direct message.
    Validates role compatibility and authorization.
    Persists message before confirming delivery.
    Assigns unique identifier and timestamp.
    Stores all metadata (sender, receiver, timestamp, read status).
    """
    if request.method == 'GET':
        from accounts.models import CustomUser
        from django.core.paginator import Paginator
        
        # Get query parameters
        other_user_id = request.query_params.get('other_user_id')
        page_number = request.query_params.get('page', 1)
        page_size = int(request.query_params.get('page_size', 50))
        
        if not other_user_id:
            return Response({
                'error': 'other_user_id query parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the other user
        try:
            other_user = CustomUser.objects.get(id=other_user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user is participant (has permission to chat with target)
        if not can_chat_with(request.user, other_user):
            return Response({
                'error': 'You do not have permission to view messages with this user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages between the two users in chronological order
        messages = Message.objects.filter(
            (Q(sender=request.user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=request.user))
        ).order_by('timestamp')
        
        # Paginate results
        paginator = Paginator(messages, page_size)
        page_obj = paginator.get_page(page_number)
        
        serializer = MessageSerializer(page_obj, many=True, context={'request': request})
        
        return Response({
            'messages': serializer.data,
            'pagination': {
                'page': page_obj.number,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            }
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        from accounts.models import CustomUser
        
        # Get request data
        receiver_id = request.data.get('receiver_id')
        content = request.data.get('content', '').strip()
        message_type = request.data.get('message_type', 'TEXT')
        
        # Validate required fields
        if not receiver_id:
            return Response({
                'error': 'receiver_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not content:
            return Response({
                'error': 'content is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the receiver user
        try:
            receiver = CustomUser.objects.get(id=receiver_id)
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'Receiver not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate role compatibility and authorization
        if not can_chat_with(request.user, receiver):
            return Response({
                'error': 'You do not have permission to send messages to this user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Persist message before confirming delivery
        # The Message model automatically assigns unique identifier (UUID) and timestamp
        message = Message.objects.create(
            sender=request.user,
            receiver=receiver,
            content=content,
            message_type=message_type,
            status='SENT'
        )
        
        # Serialize and return the created message
        serializer = MessageSerializer(message, context={'request': request})
        
        return Response({
            'message': serializer.data
        }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation(request, other_user_id):
    """
    Get conversation between current user and another user.
    Returns conversation metadata and recent messages.
    Verifies user has permission to chat with target.
    """
    from accounts.models import CustomUser
    
    # Get the other user
    other_user = get_object_or_404(CustomUser, id=other_user_id)
    
    # Verify user has permission to chat with target
    if not can_chat_with(request.user, other_user):
        return Response({
            'error': 'You do not have permission to chat with this user'
        }, status=status.HTTP_403_FORBIDDEN)

    # Get messages between the two users
    messages = Message.objects.filter(
        (Q(sender=request.user) & Q(receiver=other_user)) |
        (Q(sender=other_user) & Q(receiver=request.user))
    ).order_by('timestamp')

    # Mark messages from other user as read and update status
    from django.utils import timezone
    unread_messages = messages.filter(receiver=request.user, read=False)
    unread_messages.update(
        read=True,
        status='READ',
        read_at=timezone.now()
    )

    serializer = MessageSerializer(messages, many=True, context={'request': request})
    return Response({
        'messages': serializer.data,
        'other_user': {
            'id': str(other_user.id),
            'username': other_user.username,
            'full_name': other_user.full_name,
            'role': other_user.role,
            'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None
        }
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_conversation(request):
    """
    Create new conversation with recipient.
    Validates role compatibility and referee-organizer relationship if applicable.
    Returns conversation object.
    """
    from accounts.models import CustomUser
    
    recipient_id = request.data.get('recipient_id')
    
    if not recipient_id:
        return Response({
            'error': 'recipient_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the recipient user
    try:
        recipient = CustomUser.objects.get(id=recipient_id)
    except CustomUser.DoesNotExist:
        return Response({
            'error': 'Recipient not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Validate role compatibility
    if not can_chat_with(request.user, recipient):
        return Response({
            'error': 'You do not have permission to chat with this user'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get or create conversation metadata
    from .models import ConversationMetadata
    _, created = ConversationMetadata.objects.get_or_create(
        user=request.user,
        other_user=recipient,
        defaults={'conversation_type': 'DIRECT'}
    )
    
    # Get latest message if exists
    latest_message = Message.objects.filter(
        (Q(sender=request.user) & Q(receiver=recipient)) |
        (Q(sender=recipient) & Q(receiver=request.user))
    ).order_by('-timestamp').first()
    
    response_data = {
        'conversation': {
            'user': {
                'id': str(recipient.id),
                'username': recipient.username,
                'full_name': recipient.full_name,
                'role': recipient.role,
                'profile_picture': recipient.profile_picture.url if recipient.profile_picture else None
            },
            'latest_message': None,
            'unread_count': 0,
            'created': created
        }
    }
    
    if latest_message:
        unread_count = Message.objects.filter(
            sender=recipient,
            receiver=request.user,
            read=False
        ).count()
        
        response_data['conversation']['latest_message'] = {
            'id': str(latest_message.id),
            'content': latest_message.content,
            'timestamp': latest_message.timestamp,
            'is_from_me': latest_message.sender == request.user,
            'status': latest_message.status
        }
        response_data['conversation']['unread_count'] = unread_count
    
    return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    """
    Get list of conversations for current user.
    Supports role_filter query parameter to filter by recipient role.
    Returns paginated list sorted by most recent message timestamp descending.
    """
    user = request.user
    from accounts.models import CustomUser
    from django.core.paginator import Paginator
    
    # Get role_filter query parameter
    role_filter = request.query_params.get('role_filter', None)
    page_number = request.query_params.get('page', 1)
    page_size = int(request.query_params.get('page_size', 20))

    # Get all users who have exchanged messages with current user
    sent_to = Message.objects.filter(sender=user).values_list('receiver_id', flat=True).distinct()
    received_from = Message.objects.filter(receiver=user).values_list('sender_id', flat=True).distinct()

    user_ids = set(sent_to) | set(received_from)

    conversations = []
    for user_id in user_ids:
        try:
            other_user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            continue
        
        # Apply role filter if specified
        if role_filter and other_user.role != role_filter:
            continue

        # Get latest message
        latest_message = Message.objects.filter(
            (Q(sender=user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=user))
        ).order_by('-timestamp').first()

        if latest_message:
            # Get unread count for this conversation
            unread_count = Message.objects.filter(
                sender=other_user,
                receiver=user,
                read=False
            ).count()
            
            conversations.append({
                'user': {
                    'id': str(other_user.id),
                    'username': other_user.username,
                    'full_name': other_user.full_name,
                    'role': other_user.role,
                    'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None
                },
                'latest_message': {
                    'id': str(latest_message.id),
                    'content': latest_message.content,
                    'timestamp': latest_message.timestamp,
                    'is_from_me': latest_message.sender == user,
                    'status': latest_message.status
                },
                'unread_count': unread_count,
                'last_message_timestamp': latest_message.timestamp
            })

    # Sort by latest message timestamp (descending)
    conversations.sort(key=lambda x: x['last_message_timestamp'], reverse=True)
    
    # Remove the temporary sorting field
    for conv in conversations:
        del conv['last_message_timestamp']
    
    # Paginate results
    paginator = Paginator(conversations, page_size)
    page_obj = paginator.get_page(page_number)

    return Response({
        'conversations': list(page_obj),
        'pagination': {
            'page': page_obj.number,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'total_count': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        }
    }, status=status.HTTP_200_OK)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def edit_message(request, message_id):
    """
    PATCH: Edit message content.
    Verifies user is sender.
    Sets edited flag and edited_at timestamp.
    Only allows editing within 15 minutes.
    
    DELETE: Soft delete message.
    Verifies user is sender or receiver.
    Sets deleted flag and deleted_at timestamp.
    """
    from django.utils import timezone
    
    # Get the message
    try:
        message = Message.objects.get(id=message_id)
    except Message.DoesNotExist:
        return Response({
            'error': 'Message not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'PATCH':
        # Verify user is sender
        if message.sender != request.user:
            return Response({
                'error': 'You do not have permission to edit this message'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if message is deleted
        if message.deleted:
            return Response({
                'error': 'Cannot edit a deleted message'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if within 15 minute edit window
        if not message.can_edit(request.user):
            return Response({
                'error': 'Message can only be edited within 15 minutes of sending'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get new content
        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response({
                'error': 'content is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update message
        message.content = new_content
        message.edited = True
        message.edited_at = timezone.now()
        message.save(update_fields=['content', 'edited', 'edited_at'])
        
        # Serialize and return
        serializer = MessageSerializer(message, context={'request': request})
        return Response({
            'message': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        # Verify user is sender or receiver
        if not message.can_delete(request.user):
            return Response({
                'error': 'You do not have permission to delete this message'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete the message
        message.deleted = True
        message.deleted_at = timezone.now()
        message.save(update_fields=['deleted', 'deleted_at'])
        
        return Response({
            'message': 'Message deleted successfully'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """Get unread message count"""
    unread_count = Message.objects.filter(
        receiver=request.user,
        read=False
    ).count()

    unread_conversations = Message.objects.filter(
        receiver=request.user,
        read=False
    ).values('sender').distinct().count()

    return Response({
        'unread_count': unread_count,
        'unread_conversations': unread_conversations
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_conversation_read(request, other_user_id):
    """Mark all messages from a user as read"""
    from accounts.models import CustomUser
    other_user = get_object_or_404(CustomUser, id=other_user_id)

    updated_count = Message.objects.filter(
        sender=other_user,
        receiver=request.user,
        read=False
    ).update(read=True)

    return Response({
        'message': f'Marked {updated_count} messages as read',
        'unread_count': Message.objects.filter(receiver=request.user, read=False).count()
    }, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_conversation(request, other_user_id):
    """
    Delete conversation with a user (soft delete by archiving).
    Verifies user is participant.
    """
    from accounts.models import CustomUser
    from .models import ConversationMetadata
    from django.utils import timezone
    
    # Get the other user
    try:
        other_user = CustomUser.objects.get(id=other_user_id)
    except CustomUser.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user has messages with this user (is a participant)
    has_conversation = Message.objects.filter(
        (Q(sender=request.user) & Q(receiver=other_user)) |
        (Q(sender=other_user) & Q(receiver=request.user))
    ).exists()
    
    if not has_conversation:
        return Response({
            'error': 'No conversation found with this user'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get or create conversation metadata and mark as archived
    metadata, created = ConversationMetadata.objects.get_or_create(
        user=request.user,
        other_user=other_user,
        defaults={
            'conversation_type': 'DIRECT',
            'is_archived': True,
            'archived_at': timezone.now()
        }
    )
    
    if not created:
        metadata.is_archived = True
        metadata.archived_at = timezone.now()
        metadata.save(update_fields=['is_archived', 'archived_at'])
    
    return Response({
        'message': 'Conversation archived successfully'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_messages(request):
    """Search messages"""
    query = request.query_params.get('q', '').strip()
    conversation_id = request.query_params.get('conversation_id')

    if not query:
        return Response({'error': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)

    messages_query = Message.objects.filter(
        Q(sender=request.user) | Q(receiver=request.user)
    ).filter(content__icontains=query)

    if conversation_id:
        from accounts.models import CustomUser
        try:
            other_user = CustomUser.objects.get(id=conversation_id)
            messages_query = messages_query.filter(
                (Q(sender=request.user) & Q(receiver=other_user)) |
                (Q(sender=other_user) & Q(receiver=request.user))
            )
        except CustomUser.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)

    messages = messages_query.order_by('-timestamp')[:50]  # Limit to 50 results
    serializer = MessageSerializer(messages, many=True)

    return Response({
        'messages': serializer.data,
        'total': messages_query.count(),
        'query': query
    }, status=status.HTTP_200_OK)


# Phase 2: Real-Time Features Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_presence(request, user_id):
    """Get presence status for a specific user"""
    from accounts.models import CustomUser
    from .models import UserPresence
    
    try:
        user = CustomUser.objects.get(id=user_id)
        presence = UserPresence.objects.filter(user=user).first()
        
        if presence:
            return Response({
                'user_id': str(user.id),
                'is_online': presence.is_online,
                'last_seen': presence.last_seen,
                'last_activity': presence.last_activity
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'user_id': str(user.id),
                'is_online': False,
                'last_seen': None,
                'last_activity': None
            }, status=status.HTTP_200_OK)
    except CustomUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_multiple_presence(request):
    """Get presence status for multiple users"""
    from .models import UserPresence
    
    user_ids = request.query_params.get('user_ids', '').split(',')
    user_ids = [uid.strip() for uid in user_ids if uid.strip()]
    
    if not user_ids:
        return Response({'error': 'user_ids parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    presences = UserPresence.objects.filter(user_id__in=user_ids)
    
    result = []
    for presence in presences:
        result.append({
            'user_id': str(presence.user.id),
            'is_online': presence.is_online,
            'last_seen': presence.last_seen,
            'last_activity': presence.last_activity
        })
    
    return Response({'presences': result}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_mark_delivered(request):
    """Mark multiple messages as delivered"""
    message_ids = request.data.get('message_ids', [])
    
    if not message_ids:
        return Response({'error': 'message_ids is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.utils import timezone
    
    updated = Message.objects.filter(
        id__in=message_ids,
        receiver=request.user,
        status='SENT'
    ).update(
        status='DELIVERED',
        delivered_at=timezone.now()
    )
    
    return Response({
        'message': f'Marked {updated} messages as delivered',
        'updated_count': updated
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_mark_read(request):
    """Mark multiple messages as read"""
    message_ids = request.data.get('message_ids', [])
    
    if not message_ids:
        return Response({'error': 'message_ids is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.utils import timezone
    
    updated = Message.objects.filter(
        id__in=message_ids,
        receiver=request.user,
        status__in=['SENT', 'DELIVERED']
    ).update(
        status='READ',
        read_at=timezone.now(),
        read=True
    )
    
    return Response({
        'message': f'Marked {updated} messages as read',
        'updated_count': updated
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_message_status(request, message_id):
    """Get status of a specific message"""
    try:
        message = Message.objects.get(
            id=message_id,
            sender=request.user
        )
        
        return Response({
            'message_id': str(message.id),
            'status': message.status,
            'delivered_at': message.delivered_at,
            'read_at': message.read_at
        }, status=status.HTTP_200_OK)
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# GROUP CHAT ENDPOINTS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_chat(request, team_id):
    """
    Get group chat for a team with recent messages.
    
    Requirements: 5.1, 8.5
    """
    from teams.models import Team
    
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user is active team member
    if not can_access_group_chat(request.user, team):
        return Response(
            {'error': 'You must be an active team member to access this group chat'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create group chat for team
    group_chat, _ = GroupChat.objects.get_or_create(team=team)
    
    from .serializers import GroupChatSerializer
    serializer = GroupChatSerializer(group_chat, context={'request': request})
    
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_messages(request, team_id):
    """
    Get group messages with pagination.
    
    Supports page and page_size query parameters.
    Returns messages in chronological order.
    
    Requirements: 5.5, 8.5, 10.3, 10.4
    """
    from teams.models import Team
    from django.core.paginator import Paginator, EmptyPage
    
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user is active team member
    if not can_access_group_chat(request.user, team):
        return Response(
            {'error': 'You must be an active team member to access this group chat'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get group chat
    try:
        group_chat = GroupChat.objects.get(team=team)
    except GroupChat.DoesNotExist:
        # Create group chat if it doesn't exist
        group_chat = GroupChat.objects.create(team=team)
    
    # Get pagination parameters
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('page_size', 50)
    
    try:
        page = int(page)
        page_size = int(page_size)
    except ValueError:
        return Response({'error': 'Invalid page or page_size parameter'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Limit page size to prevent abuse
    page_size = min(page_size, 100)
    
    # Get messages in chronological order
    messages = group_chat.messages.filter(deleted=False).order_by('timestamp')
    
    # Paginate
    paginator = Paginator(messages, page_size)
    
    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        return Response({
            'messages': [],
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'total_count': paginator.count
        }, status=status.HTTP_200_OK)
    
    from .serializers import GroupMessageSerializer
    serializer = GroupMessageSerializer(page_obj.object_list, many=True, context={'request': request})
    
    return Response({
        'messages': serializer.data,
        'page': page,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_group_message(request, team_id):
    """
    Send a message to a group chat.
    
    Verifies user is active team member.
    Persists message with all metadata.
    
    Requirements: 5.5, 8.5, 10.1, 10.2, 10.6
    """
    from teams.models import Team
    
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user is active team member
    if not can_access_group_chat(request.user, team):
        return Response(
            {'error': 'You must be an active team member to send messages'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create group chat
    group_chat, _ = GroupChat.objects.get_or_create(team=team)
    
    # Validate content
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    message_type = request.data.get('message_type', 'TEXT')
    reply_to_id = request.data.get('reply_to')
    
    # Validate message type
    valid_types = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT']
    if message_type not in valid_types:
        return Response({'error': f'Invalid message_type. Must be one of: {", ".join(valid_types)}'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Validate reply_to if provided
    reply_to = None
    if reply_to_id:
        try:
            reply_to = GroupMessage.objects.get(id=reply_to_id, group_chat=group_chat)
        except GroupMessage.DoesNotExist:
            return Response({'error': 'Reply message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create message
    message = GroupMessage.objects.create(
        group_chat=group_chat,
        sender=request.user,
        content=content,
        message_type=message_type,
        reply_to=reply_to,
        status='SENT'
    )
    
    from .serializers import GroupMessageSerializer
    serializer = GroupMessageSerializer(message, context={'request': request})
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_group_messages_read(request, team_id):
    """
    Mark group messages as read up to a specified message.
    
    Creates GroupMessageReadReceipt records.
    
    Requirements: 6.8, 9.3
    """
    from teams.models import Team
    
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify user is active team member
    if not can_access_group_chat(request.user, team):
        return Response(
            {'error': 'You must be an active team member to mark messages as read'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get message_id
    message_id = request.data.get('message_id')
    if not message_id:
        return Response({'error': 'message_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get group chat
    try:
        group_chat = GroupChat.objects.get(team=team)
    except GroupChat.DoesNotExist:
        return Response({'error': 'Group chat not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get the message
    try:
        message = GroupMessage.objects.get(id=message_id, group_chat=group_chat)
    except GroupMessage.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all messages up to and including this message
    messages_to_mark = GroupMessage.objects.filter(
        group_chat=group_chat,
        timestamp__lte=message.timestamp,
        deleted=False
    ).exclude(sender=request.user)  # Don't mark own messages as read
    
    # Create read receipts for messages that don't have one yet
    receipts_created = 0
    for msg in messages_to_mark:
        _, created = GroupMessageReadReceipt.objects.get_or_create(
            message=msg,
            user=request.user
        )
        if created:
            receipts_created += 1
    
    return Response({
        'message': f'Marked {receipts_created} messages as read',
        'receipts_created': receipts_created
    }, status=status.HTTP_200_OK)
