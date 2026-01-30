from django.db.models import Q
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from ..models import Team, ActivityHistory
from accounts.models import CustomUser


class ActivityHistoryService:
    """
    Service class for managing and retrieving team activity history.
    Provides chronological display, filtering, and activity tracking functionality.
    """

    @staticmethod
    def record_activity(
        team_id: str,
        event_type: str,
        description: str,
        performed_by_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ActivityHistory:
        """
        Record a new activity event for a team.
        
        Args:
            team_id: UUID of the team
            event_type: Type of event (must be valid choice)
            description: Human-readable description of the event
            performed_by_id: Optional UUID of the user who performed the action
            metadata: Optional additional event-specific data
            
        Returns:
            ActivityHistory: The created activity record
            
        Raises:
            Team.DoesNotExist: If team not found
            ValidationError: If event_type is invalid or user not found
        """
        # Validate event type
        valid_event_types = [choice[0] for choice in ActivityHistory.EVENT_TYPE_CHOICES]
        if event_type not in valid_event_types:
            raise ValidationError(f"Invalid event type: {event_type}")

        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        performed_by = None
        if performed_by_id:
            try:
                performed_by = CustomUser.objects.get(id=performed_by_id, role='PLAYER')
            except CustomUser.DoesNotExist:
                raise ValidationError(f"User with ID {performed_by_id} not found or not a player")

        # Create activity record
        activity = ActivityHistory.objects.create(
            team=team,
            event_type=event_type,
            description=description,
            performed_by=performed_by,
            metadata=metadata or {}
        )

        return activity

    @staticmethod
    def get_team_activity_history(
        team_id: str,
        limit: Optional[int] = None,
        offset: int = 0,
        event_types: Optional[List[str]] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        performed_by_id: Optional[str] = None
    ) -> List[ActivityHistory]:
        """
        Get activity history for a team with optional filtering.
        
        Args:
            team_id: UUID of the team
            limit: Optional maximum number of records to return
            offset: Number of records to skip (for pagination)
            event_types: Optional list of event types to filter by
            date_from: Optional start date for filtering
            date_to: Optional end date for filtering
            performed_by_id: Optional user ID to filter by
            
        Returns:
            List[ActivityHistory]: List of activity records in chronological order (newest first)
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        # Build query
        query = ActivityHistory.objects.filter(team=team).select_related('performed_by')

        # Apply filters
        if event_types:
            query = query.filter(event_type__in=event_types)

        if date_from:
            query = query.filter(timestamp__gte=date_from)

        if date_to:
            query = query.filter(timestamp__lte=date_to)

        if performed_by_id:
            query = query.filter(performed_by_id=performed_by_id)

        # Apply ordering (newest first)
        query = query.order_by('-timestamp')

        # Apply pagination
        if offset:
            query = query[offset:]

        if limit:
            query = query[:limit]

        return list(query)

    @staticmethod
    def get_activity_by_event_type(team_id: str, event_type: str) -> List[ActivityHistory]:
        """
        Get all activities of a specific event type for a team.
        
        Args:
            team_id: UUID of the team
            event_type: Event type to filter by
            
        Returns:
            List[ActivityHistory]: List of activities of the specified type
            
        Raises:
            Team.DoesNotExist: If team not found
            ValidationError: If event_type is invalid
        """
        # Validate event type
        valid_event_types = [choice[0] for choice in ActivityHistory.EVENT_TYPE_CHOICES]
        if event_type not in valid_event_types:
            raise ValidationError(f"Invalid event type: {event_type}")

        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        return list(ActivityHistory.objects.filter(
            team=team,
            event_type=event_type
        ).select_related('performed_by').order_by('-timestamp'))

    @staticmethod
    def get_recent_activity(team_id: str, days: int = 7, limit: int = 10) -> List[ActivityHistory]:
        """
        Get recent activity for a team within the specified number of days.
        
        Args:
            team_id: UUID of the team
            days: Number of days to look back (default: 7)
            limit: Maximum number of records to return (default: 10)
            
        Returns:
            List[ActivityHistory]: List of recent activities
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        cutoff_date = timezone.now() - timedelta(days=days)

        return list(ActivityHistory.objects.filter(
            team=team,
            timestamp__gte=cutoff_date
        ).select_related('performed_by').order_by('-timestamp')[:limit])

    @staticmethod
    def get_activity_summary(team_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get a summary of team activity over the specified period.
        
        Args:
            team_id: UUID of the team
            days: Number of days to analyze (default: 30)
            
        Returns:
            Dict[str, Any]: Activity summary with counts by event type
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        cutoff_date = timezone.now() - timedelta(days=days)

        # Get activities within the period
        activities = ActivityHistory.objects.filter(
            team=team,
            timestamp__gte=cutoff_date
        )

        # Count by event type
        event_counts = {}
        total_activities = 0
        most_active_user = None
        user_activity_counts = {}

        for activity in activities:
            # Count by event type
            event_type = activity.event_type
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
            total_activities += 1

            # Count by user
            if activity.performed_by:
                user_id = str(activity.performed_by.id)
                user_activity_counts[user_id] = user_activity_counts.get(user_id, 0) + 1

        # Find most active user
        if user_activity_counts:
            most_active_user_id = max(user_activity_counts, key=user_activity_counts.get)
            try:
                most_active_user = CustomUser.objects.get(id=most_active_user_id)
            except CustomUser.DoesNotExist:
                pass

        return {
            'team_id': str(team.id),
            'team_name': team.name,
            'period_days': days,
            'total_activities': total_activities,
            'event_type_counts': event_counts,
            'most_active_user': {
                'id': str(most_active_user.id),
                'name': most_active_user.full_name,
                'activity_count': user_activity_counts.get(str(most_active_user.id), 0)
            } if most_active_user else None,
            'generated_at': timezone.now()
        }

    @staticmethod
    def search_activity_history(
        team_id: str,
        search_term: str,
        limit: int = 50
    ) -> List[ActivityHistory]:
        """
        Search activity history by description or metadata content.
        
        Args:
            team_id: UUID of the team
            search_term: Term to search for in descriptions
            limit: Maximum number of results to return
            
        Returns:
            List[ActivityHistory]: List of matching activities
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        # Search in description field
        query = ActivityHistory.objects.filter(
            team=team,
            description__icontains=search_term
        ).select_related('performed_by').order_by('-timestamp')

        return list(query[:limit])

    @staticmethod
    def get_activity_timeline(
        team_id: str,
        group_by_date: bool = True
    ) -> Union[List[ActivityHistory], Dict[str, List[ActivityHistory]]]:
        """
        Get activity timeline for a team, optionally grouped by date.
        
        Args:
            team_id: UUID of the team
            group_by_date: Whether to group activities by date
            
        Returns:
            Union[List[ActivityHistory], Dict[str, List[ActivityHistory]]]: 
                Activities or activities grouped by date
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        activities = list(ActivityHistory.objects.filter(
            team=team
        ).select_related('performed_by').order_by('-timestamp'))

        if not group_by_date:
            return activities

        # Group by date
        grouped_activities = {}
        for activity in activities:
            date_key = activity.timestamp.date().isoformat()
            if date_key not in grouped_activities:
                grouped_activities[date_key] = []
            grouped_activities[date_key].append(activity)

        return grouped_activities

    @staticmethod
    def get_user_activity_in_team(
        team_id: str,
        user_id: str,
        limit: Optional[int] = None
    ) -> List[ActivityHistory]:
        """
        Get all activities performed by a specific user in a team.
        
        Args:
            team_id: UUID of the team
            user_id: UUID of the user
            limit: Optional maximum number of records to return
            
        Returns:
            List[ActivityHistory]: List of activities performed by the user
            
        Raises:
            Team.DoesNotExist: If team not found
            CustomUser.DoesNotExist: If user not found
        """
        try:
            team = Team.objects.get(id=team_id)
            user = CustomUser.objects.get(id=user_id, role='PLAYER')
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")
        except CustomUser.DoesNotExist:
            raise CustomUser.DoesNotExist(f"User with ID {user_id} not found or not a player")

        query = ActivityHistory.objects.filter(
            team=team,
            performed_by=user
        ).order_by('-timestamp')

        if limit:
            query = query[:limit]

        return list(query)

    @staticmethod
    def get_activity_statistics(team_id: str) -> Dict[str, Any]:
        """
        Get comprehensive activity statistics for a team.
        
        Args:
            team_id: UUID of the team
            
        Returns:
            Dict[str, Any]: Comprehensive activity statistics
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        activities = ActivityHistory.objects.filter(team=team)

        # Basic counts
        total_activities = activities.count()
        
        if total_activities == 0:
            return {
                'team_id': str(team.id),
                'team_name': team.name,
                'total_activities': 0,
                'first_activity': None,
                'last_activity': None,
                'event_type_breakdown': {},
                'monthly_activity_trend': {},
                'most_active_users': []
            }

        # Get first and last activities
        first_activity = activities.order_by('timestamp').first()
        last_activity = activities.order_by('-timestamp').first()

        # Event type breakdown
        event_type_breakdown = {}
        for choice in ActivityHistory.EVENT_TYPE_CHOICES:
            event_type = choice[0]
            count = activities.filter(event_type=event_type).count()
            if count > 0:
                event_type_breakdown[event_type] = count

        # Monthly activity trend (last 12 months)
        monthly_trend = {}
        current_date = timezone.now()
        for i in range(12):
            month_start = current_date.replace(day=1) - timedelta(days=30 * i)
            month_end = month_start.replace(day=28) + timedelta(days=4)  # End of month
            month_key = month_start.strftime('%Y-%m')
            
            count = activities.filter(
                timestamp__gte=month_start,
                timestamp__lt=month_end
            ).count()
            
            monthly_trend[month_key] = count

        # Most active users
        user_activity_counts = {}
        for activity in activities.filter(performed_by__isnull=False).select_related('performed_by'):
            user_id = str(activity.performed_by.id)
            if user_id not in user_activity_counts:
                user_activity_counts[user_id] = {
                    'user': activity.performed_by,
                    'count': 0
                }
            user_activity_counts[user_id]['count'] += 1

        # Sort by activity count and get top 5
        most_active_users = sorted(
            user_activity_counts.values(),
            key=lambda x: x['count'],
            reverse=True
        )[:5]

        # Format most active users
        formatted_most_active = []
        for user_data in most_active_users:
            formatted_most_active.append({
                'id': str(user_data['user'].id),
                'name': user_data['user'].full_name,
                'activity_count': user_data['count']
            })

        return {
            'team_id': str(team.id),
            'team_name': team.name,
            'total_activities': total_activities,
            'first_activity': {
                'timestamp': first_activity.timestamp,
                'event_type': first_activity.event_type,
                'description': first_activity.description
            },
            'last_activity': {
                'timestamp': last_activity.timestamp,
                'event_type': last_activity.event_type,
                'description': last_activity.description
            },
            'event_type_breakdown': event_type_breakdown,
            'monthly_activity_trend': monthly_trend,
            'most_active_users': formatted_most_active
        }

    @staticmethod
    def delete_old_activities(team_id: str, days_to_keep: int = 365) -> int:
        """
        Delete old activity records beyond the specified retention period.
        
        Args:
            team_id: UUID of the team
            days_to_keep: Number of days of history to retain (default: 365)
            
        Returns:
            int: Number of activities deleted
            
        Raises:
            Team.DoesNotExist: If team not found
        """
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        cutoff_date = timezone.now() - timedelta(days=days_to_keep)

        # Delete old activities
        deleted_count, _ = ActivityHistory.objects.filter(
            team=team,
            timestamp__lt=cutoff_date
        ).delete()

        return deleted_count

    @staticmethod
    def export_activity_history(team_id: str, format: str = 'dict') -> Union[List[Dict[str, Any]], str]:
        """
        Export activity history for a team in the specified format.
        
        Args:
            team_id: UUID of the team
            format: Export format ('dict' or 'csv')
            
        Returns:
            Union[List[Dict[str, Any]], str]: Exported data
            
        Raises:
            Team.DoesNotExist: If team not found
            ValueError: If format is not supported
        """
        if format not in ['dict', 'csv']:
            raise ValueError("Format must be 'dict' or 'csv'")

        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise Team.DoesNotExist(f"Team with ID {team_id} not found")

        activities = ActivityHistory.objects.filter(
            team=team
        ).select_related('performed_by').order_by('-timestamp')

        if format == 'dict':
            return [
                {
                    'id': str(activity.id),
                    'event_type': activity.event_type,
                    'description': activity.description,
                    'performed_by': activity.performed_by.full_name if activity.performed_by else None,
                    'performed_by_id': str(activity.performed_by.id) if activity.performed_by else None,
                    'timestamp': activity.timestamp.isoformat(),
                    'metadata': activity.metadata
                }
                for activity in activities
            ]

        elif format == 'csv':
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'ID', 'Event Type', 'Description', 'Performed By', 
                'Performed By ID', 'Timestamp', 'Metadata'
            ])
            
            # Write data
            for activity in activities:
                writer.writerow([
                    str(activity.id),
                    activity.event_type,
                    activity.description,
                    activity.performed_by.full_name if activity.performed_by else '',
                    str(activity.performed_by.id) if activity.performed_by else '',
                    activity.timestamp.isoformat(),
                    str(activity.metadata)
                ])
            
            return output.getvalue()