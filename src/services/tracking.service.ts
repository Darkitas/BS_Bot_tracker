import type { TrackerDatabase } from "../db/database";

type RegisterMessageInput = {
  messageId: string;
  groupId: string;
  groupName: string;
  userJid: string;
  phone: string;
  displayName?: string;
  sentAt: number;
  body?: string;
};

export class TrackingService {
  constructor(private readonly db: TrackerDatabase) {}

  registerMessage(input: RegisterMessageInput): void {
    const insertGroup = this.db.prepare(`
      INSERT INTO groups (id, name, created_at)
      VALUES (@groupId, @groupName, @sentAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name
    `);

    const insertMember = this.db.prepare(`
      INSERT INTO members (group_id, user_jid, phone, display_name, joined_at)
      VALUES (@groupId, @userJid, @phone, @displayName, @sentAt)
      ON CONFLICT(group_id, user_jid) DO UPDATE SET
        phone = excluded.phone,
        display_name = COALESCE(excluded.display_name, members.display_name)
    `);

    const insertMessage = this.db.prepare(`
      INSERT OR IGNORE INTO messages (message_id, group_id, user_jid, sent_at, body)
      VALUES (@messageId, @groupId, @userJid, @sentAt, @body)
    `);

    const upsertActivity = this.db.prepare(`
      INSERT INTO message_activity (group_id, user_jid, last_message_at, message_count)
      VALUES (@groupId, @userJid, @sentAt, 1)
      ON CONFLICT(group_id, user_jid) DO UPDATE SET
        last_message_at = CASE
          WHEN excluded.last_message_at > message_activity.last_message_at
          THEN excluded.last_message_at
          ELSE message_activity.last_message_at
        END,
        message_count = message_activity.message_count + 1
    `);

    const tx = this.db.transaction((payload: RegisterMessageInput) => {
      insertGroup.run(payload);
      insertMember.run(payload);
      insertMessage.run(payload);
      upsertActivity.run(payload);
    });

    tx(input);
  }
}
