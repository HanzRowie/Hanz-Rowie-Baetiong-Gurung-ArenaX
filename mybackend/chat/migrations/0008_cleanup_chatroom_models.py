# Generated migration to clean up old ChatRoom models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def cleanup_chatroom_tables(apps, schema_editor):
    """Drop old ChatRoom tables using raw SQL"""
    with schema_editor.connection.cursor() as cursor:
        # Drop tables in correct order (foreign keys first)
        cursor.execute("DROP TABLE IF EXISTS chat_room_participants")
        cursor.execute("DROP TABLE IF EXISTS chat_rooms")
        
        # Remove room_id column from chat_conversation_metadata if it exists
        cursor.execute("PRAGMA table_info(chat_conversation_metadata)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'room_id' in columns:
            # SQLite doesn't support DROP COLUMN directly, need to recreate table
            cursor.execute("""
                CREATE TABLE chat_conversation_metadata_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    other_user_id INTEGER NOT NULL,
                    conversation_type VARCHAR(10) NOT NULL DEFAULT 'DIRECT',
                    is_archived BOOLEAN NOT NULL DEFAULT 0,
                    is_muted BOOLEAN NOT NULL DEFAULT 0,
                    is_pinned BOOLEAN NOT NULL DEFAULT 0,
                    is_blocked BOOLEAN NOT NULL DEFAULT 0,
                    last_read_message_id TEXT,
                    archived_at DATETIME,
                    muted_until DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES accounts_customuser(id),
                    FOREIGN KEY (other_user_id) REFERENCES accounts_customuser(id),
                    FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id),
                    UNIQUE (user_id, other_user_id)
                )
            """)
            cursor.execute("""
                INSERT INTO chat_conversation_metadata_new 
                SELECT id, user_id, other_user_id, conversation_type, is_archived, is_muted, 
                       is_pinned, is_blocked, last_read_message_id, archived_at, muted_until, 
                       created_at, updated_at
                FROM chat_conversation_metadata
            """)
            cursor.execute("DROP TABLE chat_conversation_metadata")
            cursor.execute("ALTER TABLE chat_conversation_metadata_new RENAME TO chat_conversation_metadata")
        
        # Remove room_id column from chat_messages if it exists
        cursor.execute("PRAGMA table_info(chat_messages)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'room_id' in columns:
            # Get the table structure
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_messages'")
            create_sql = cursor.fetchone()[0]
            
            # Create new table without room_id
            cursor.execute("""
                CREATE TABLE chat_messages_new (
                    id TEXT PRIMARY KEY,
                    sender_id INTEGER NOT NULL,
                    receiver_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    message_type VARCHAR(10) NOT NULL DEFAULT 'TEXT',
                    status VARCHAR(10) NOT NULL DEFAULT 'SENT',
                    timestamp DATETIME NOT NULL,
                    delivered_at DATETIME,
                    read_at DATETIME,
                    edited BOOLEAN NOT NULL DEFAULT 0,
                    edited_at DATETIME,
                    deleted BOOLEAN NOT NULL DEFAULT 0,
                    deleted_at DATETIME,
                    deleted_for_everyone BOOLEAN NOT NULL DEFAULT 0,
                    reply_to_id TEXT,
                    read BOOLEAN NOT NULL DEFAULT 0,
                    FOREIGN KEY (sender_id) REFERENCES accounts_customuser(id),
                    FOREIGN KEY (receiver_id) REFERENCES accounts_customuser(id),
                    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
                )
            """)
            cursor.execute("""
                INSERT INTO chat_messages_new 
                SELECT id, sender_id, receiver_id, content, message_type, status, timestamp,
                       delivered_at, read_at, edited, edited_at, deleted, deleted_at,
                       deleted_for_everyone, reply_to_id, read
                FROM chat_messages
            """)
            cursor.execute("DROP TABLE chat_messages")
            cursor.execute("ALTER TABLE chat_messages_new RENAME TO chat_messages")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX chat_msg_sr_ts_idx ON chat_messages (sender_id, receiver_id, timestamp DESC)")
            cursor.execute("CREATE INDEX chat_msg_unread_idx ON chat_messages (receiver_id, read, timestamp DESC)")


def reverse_cleanup(apps, schema_editor):
    """Cannot reverse this migration"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0007_add_conversation_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(cleanup_chatroom_tables, reverse_cleanup),
    ]
