# Migration to fix chat_message table schema by removing room_id column

from django.db import migrations


def fix_message_table(apps, schema_editor):
    """Remove room_id column from chat_message table if it exists"""
    with schema_editor.connection.cursor() as cursor:
        # Check if room_id column exists in chat_message
        cursor.execute("PRAGMA table_info(chat_message)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'room_id' in columns:
            # Create new table without room_id
            cursor.execute("""
                CREATE TABLE chat_message_new (
                    id TEXT PRIMARY KEY,
                    sender_id TEXT NOT NULL,
                    receiver_id TEXT NOT NULL,
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
                    FOREIGN KEY (reply_to_id) REFERENCES chat_message(id)
                )
            """)
            
            # Copy data
            cursor.execute("""
                INSERT INTO chat_message_new 
                SELECT id, sender_id, receiver_id, content, message_type, status, timestamp,
                       delivered_at, read_at, edited, edited_at, deleted, deleted_at,
                       deleted_for_everyone, reply_to_id, read
                FROM chat_message
            """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE chat_message")
            cursor.execute("ALTER TABLE chat_message_new RENAME TO chat_message")
            
            # Recreate indexes
            cursor.execute("CREATE INDEX chat_msg_sr_ts_idx ON chat_message (sender_id, receiver_id, timestamp DESC)")
            cursor.execute("CREATE INDEX chat_msg_unread_idx ON chat_message (receiver_id, read, timestamp DESC)")


def reverse_fix(apps, schema_editor):
    """Cannot reverse this migration"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0010_alter_groupchat_id_alter_groupmessage_id_and_more"),
    ]

    operations = [
        migrations.RunPython(fix_message_table, reverse_fix),
    ]
