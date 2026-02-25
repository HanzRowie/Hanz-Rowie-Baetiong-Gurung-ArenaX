# Migration to sync model state after manual cleanup

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0008_cleanup_chatroom_models"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    # This migration only updates Django's migration state to match the actual database
    # The actual database changes were done in 0008_cleanup_chatroom_models
    operations = [
        # State-only operations to remove ChatRoom models from migration state
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Remove fields from models that no longer exist
                migrations.RemoveField(
                    model_name='chatroomparticipant',
                    name='room',
                ),
                migrations.RemoveField(
                    model_name='chatroomparticipant',
                    name='user',
                ),
                migrations.AlterUniqueTogether(
                    name='chatroomparticipant',
                    unique_together=set(),
                ),
                migrations.DeleteModel(
                    name='ChatRoomParticipant',
                ),
                migrations.DeleteModel(
                    name='ChatRoom',
                ),
                migrations.RemoveField(
                    model_name='conversationmetadata',
                    name='room',
                ),
                migrations.RemoveField(
                    model_name='message',
                    name='room',
                ),
                migrations.RemoveIndex(
                    model_name='message',
                    name='chat_msg_room_ts_idx',
                ),
                migrations.AlterUniqueTogether(
                    name='conversationmetadata',
                    unique_together={('user', 'other_user')},
                ),
                migrations.AlterField(
                    model_name='conversationmetadata',
                    name='other_user',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='conversation_metadata_reverse',
                        to=settings.AUTH_USER_MODEL
                    ),
                ),
                migrations.AlterField(
                    model_name='message',
                    name='receiver',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='received_messages_chat',
                        to=settings.AUTH_USER_MODEL
                    ),
                ),
                # Fix UUID field definitions to match models
                migrations.AlterField(
                    model_name='groupchat',
                    name='id',
                    field=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False),
                ),
                migrations.AlterField(
                    model_name='groupmessage',
                    name='id',
                    field=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False),
                ),
                migrations.AlterField(
                    model_name='groupmessagereadreceipt',
                    name='id',
                    field=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False),
                ),
                migrations.AlterField(
                    model_name='refereeorganizerrelationship',
                    name='id',
                    field=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False),
                ),
            ],
            # No database operations - everything was already done in migration 0008
            database_operations=[],
        ),
    ]
