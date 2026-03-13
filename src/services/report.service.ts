import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import type { TrackerDatabase } from "../db/database";

type InactiveMember = {
  groupId: string;
  userJid: string;
  phone: string;
  displayName: string | null;
  lastMessageAt: number | null;
  messageCount: number | null;
};

type ReportOutput = {
  total: number;
  txtPath: string;
  csvPath: string;
};

export class ReportService {
  constructor(private readonly db: TrackerDatabase, private readonly outputDir: string) {}

  generateInactiveMembersReport(days: number, nowMs = Date.now()): ReportOutput {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const cutoff = dayjs(nowMs).subtract(days, "day").valueOf();

    const rows = this.db
      .prepare(
        `
        SELECT
          m.group_id AS groupId,
          m.user_jid AS userJid,
          m.phone AS phone,
          m.display_name AS displayName,
          a.last_message_at AS lastMessageAt,
          a.message_count AS messageCount
        FROM members m
        LEFT JOIN message_activity a
          ON a.group_id = m.group_id
          AND a.user_jid = m.user_jid
        WHERE a.last_message_at IS NULL OR a.last_message_at < ?
        ORDER BY m.group_id, COALESCE(a.last_message_at, 0) ASC, m.phone ASC
      `
      )
      .all(cutoff) as InactiveMember[];

    const timestamp = dayjs(nowMs).format("YYYYMMDD_HHmmss");
    const txtPath = path.join(this.outputDir, `inactive_${days}d_${timestamp}.txt`);
    const csvPath = path.join(this.outputDir, `inactive_${days}d_${timestamp}.csv`);

    const txtBody = this.toTxt(rows, days, nowMs);
    const csvBody = this.toCsv(rows);

    fs.writeFileSync(txtPath, txtBody, "utf8");
    fs.writeFileSync(csvPath, csvBody, "utf8");

    return {
      total: rows.length,
      txtPath,
      csvPath
    };
  }

  private toTxt(rows: InactiveMember[], days: number, nowMs: number): string {
    const header = [
      "=== REPORTE DE INACTIVOS ===",
      `Ventana: ${days} dias`,
      `Generado: ${dayjs(nowMs).format("YYYY-MM-DD HH:mm:ss")}`,
      `Total: ${rows.length}`,
      ""
    ];

    const lines = rows.map((row, index) => {
      const lastMessage = row.lastMessageAt
        ? dayjs(row.lastMessageAt).format("YYYY-MM-DD HH:mm")
        : "nunca";
      const name = row.displayName ?? "(sin nombre)";

      return `${index + 1}. ${row.phone} | ${name} | grupo=${row.groupId} | ultimo=${lastMessage}`;
    });

    return [...header, ...lines].join("\n");
  }

  private toCsv(rows: InactiveMember[]): string {
    const header = "group_id,user_jid,phone,display_name,last_message_at,message_count";
    const lines = rows.map((row) => {
      const escapedName = (row.displayName ?? "").replaceAll('"', '""');
      const lastMessage = row.lastMessageAt ? String(row.lastMessageAt) : "";
      const messageCount = row.messageCount ? String(row.messageCount) : "0";

      return [
        row.groupId,
        row.userJid,
        row.phone,
        `"${escapedName}"`,
        lastMessage,
        messageCount
      ].join(",");
    });

    return `${header}\n${lines.join("\n")}`;
  }
}
