import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env";

export type TrackerDatabase = Database.Database;

function ensureParentDirectory(filePath: string): void {
    const parentDir = path.dirname(filePath);
    fs.mkdirSync(parentDir, { recursive: true });
}

export function createDatabase(dbPath = env.dbPath): TrackerDatabase {
    ensureParentDirectory(dbPath);

    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
        group_id TEXT NOT NULL,
        user_jid TEXT NOT NULL,
        phone TEXT NOT NULL,
        display_name TEXT,
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (group_id, user_jid),
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_activity (
        group_id TEXT NOT NULL,
        user_jid TEXT NOT NULL,
        last_message_at INTEGER NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (group_id, user_jid),
        FOREIGN KEY (group_id, user_jid) REFERENCES members (group_id, user_jid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
        message_id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_jid TEXT NOT NULL,
        sent_at INTEGER NOT NULL,
        body TEXT,
        FOREIGN KEY (group_id, user_jid) REFERENCES members (group_id, user_jid) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_members_group ON members (group_id);
    CREATE INDEX IF NOT EXISTS idx_activity_group ON message_activity (group_id, last_message_at);
    CREATE INDEX IF NOT EXISTS idx_messages_group_sent_at ON messages (group_id, sent_at);
    `);

    return db;
}
