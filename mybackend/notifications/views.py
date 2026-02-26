from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.models import Notification
from .serializers import NotificationSerializer
import logging

logger = logging.getLogger(__name__)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing user notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        logger.info(f"[NotificationViewSet] Getting queryset for user: {self.request.user.id}")
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        logger.info(f"[NotificationViewSet] unread() called for user: {request.user.id}")
        notifications = self.get_queryset().filter(read=False).order_by('-created_at')
        serializer = self.get_serializer(notifications, many=True)
        logger.info(f"[NotificationViewSet] Returning {len(serializer.data)} unread notifications")
        return Response({
            'notifications': serializer.data,
            'unread_count': notifications.count()
        })

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notification count"""
        logger.info(f"[NotificationViewSet] unread_count() called for user: {request.user.id}")
        count = self.get_queryset().filter(read=False).count()
        logger.info(f"[NotificationViewSet] Unread count: {count}")
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        logger.info(f"[NotificationViewSet] mark_as_read() called for notification: {pk}")
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read (alias)"""
        logger.info(f"[NotificationViewSet] mark_read() called for notification: {pk}")
        return self.mark_as_read(request, pk)

    @action(detail=True, methods=['post'])
    def mark_unread(self, request, pk=None):
        """Mark a notification as unread"""
        logger.info(f"[NotificationViewSet] mark_unread() called for notification: {pk}")
        notification = self.get_object()
        notification.read = False
        notification.save()
        return Response({'status': 'notification marked as unread'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        logger.info(f"[NotificationViewSet] mark_all_as_read() called for user: {request.user.id}")
        count = self.get_queryset().update(read=True)
        logger.info(f"[NotificationViewSet] Marked {count} notifications as read")
        return Response({'status': 'all notifications marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read (alias)"""
        logger.info(f"[NotificationViewSet] mark_all_read() called for user: {request.user.id}")
        return self.mark_all_as_read(request)

    @action(detail=True, methods=['delete'])
    def soft_delete(self, request, pk=None):
        """Soft delete a notification"""
        logger.info(f"[NotificationViewSet] soft_delete() called for notification: {pk}")
        notification = self.get_object()
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Clear all notifications"""
        logger.info(f"[NotificationViewSet] clear_all() called for user: {request.user.id}")
        count = self.get_queryset().count()
        self.get_queryset().delete()
        logger.info(f"[NotificationViewSet] Cleared {count} notifications")
        return Response({'status': 'all notifications cleared'})
