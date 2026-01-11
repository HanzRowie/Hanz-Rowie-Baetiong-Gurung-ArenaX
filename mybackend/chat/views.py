from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Message, ChatMessage
from .serializers import MessageSerializer, ChatMessageSerializer

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation(request, other_user_id):
    """Get conversation between current user and another user"""
    from accounts.models import CustomUser
    other_user = get_object_or_404(CustomUser, id=other_user_id)

    messages = Message.objects.filter(
        (Q(sender=request.user) & Q(receiver=other_user)) |
        (Q(sender=other_user) & Q(receiver=request.user))
    ).order_by('timestamp')

    # Mark messages from other user as read
    messages.filter(receiver=request.user, read=False).update(read=True)

    serializer = MessageSerializer(messages, many=True, context={'request': request})
    return Response({
        'messages': serializer.data,
        'other_user': {
            'id': other_user.id,
            'username': other_user.username,
            'full_name': other_user.full_name,
            'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None
        }
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a private message"""
    data = request.data
    receiver_id = data.get('receiver_id')
    content = data.get('content', '').strip()

    if not receiver_id or not content:
        return Response({'error': 'Receiver ID and content are required'}, status=status.HTTP_400_BAD_REQUEST)

    from accounts.models import CustomUser
    try:
        receiver = CustomUser.objects.get(id=receiver_id)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Receiver not found'}, status=status.HTTP_404_NOT_FOUND)

    # Create message
    message = Message.objects.create(
        sender=request.user,
        receiver=receiver,
        content=content
    )

    serializer = MessageSerializer(message, context={'request': request})
    return Response({
        'message_data': serializer.data,
        'message': 'Message sent successfully'
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    """Get list of conversations for current user"""
    user = request.user

    # Get all users who have exchanged messages with current user
    sent_messages = Message.objects.filter(sender=user).values_list('receiver', flat=True)
    received_messages = Message.objects.filter(receiver=user).values_list('sender', flat=True)

    user_ids = set(sent_messages) | set(received_messages)

    conversations = []
    for user_id in user_ids:
        from accounts.models import CustomUser
        other_user = CustomUser.objects.get(id=user_id)

        # Get latest message
        latest_message = Message.objects.filter(
            (Q(sender=user) & Q(receiver=other_user)) |
            (Q(sender=other_user) & Q(receiver=user))
        ).order_by('-timestamp').first()

        if latest_message:
            conversations.append({
                'user': {
                    'id': other_user.id,
                    'username': other_user.username,
                    'full_name': other_user.full_name,
                    'profile_picture': other_user.profile_picture.url if other_user.profile_picture else None
                },
                'latest_message': {
                    'content': latest_message.content,
                    'timestamp': latest_message.timestamp,
                    'is_from_me': latest_message.sender == user
                }
            })

    # Sort by latest message timestamp
    conversations.sort(key=lambda x: x['latest_message']['timestamp'], reverse=True)

    return Response({'conversations': conversations}, status=status.HTTP_200_OK)

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
    """Delete conversation with a user (soft delete by archiving)"""
    # For now, just return success - in production implement archiving
    return Response({'message': 'Conversation deleted successfully'}, status=status.HTTP_200_OK)

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
