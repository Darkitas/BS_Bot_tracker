import dayjs from "dayjs";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createDatabase } from "../db/database";
import { ReportService } from "../services/report.service";
import { TrackingService } from "../services/tracking.service";

function daysAgo(days: number): number {
    return dayjs().subtract(days, "day").valueOf();
}

function main(): void {
    const db = createDatabase(env.dbPath);
    const tracking = new TrackingService(db);
    const reports = new ReportService(db, env.reportOutputDir);

    tracking.registerMessage({
        messageId: "msg-1",
        groupId: "12345@g.us",
        groupName: "Reclutamiento",
        userJid: "573001112233@s.whatsapp.net",
        phone: "+57 300 111 2233",
        displayName: "Alpha",
        sentAt: daysAgo(2),
        body: "Busco clan activo"
    });

    tracking.registerMessage({
        messageId: "msg-2",
        groupId: "12345@g.us",
        groupName: "Reclutamiento",
        userJid: "573004445566@s.whatsapp.net",
        phone: "+57 300 444 5566",
        displayName: "Bravo",
        sentAt: daysAgo(80),
        body: "Hola"
    });

  // Miembro sin mensajes para probar caso "nunca".
    const insertGroupOnly = db.prepare(`
        INSERT INTO groups (id, name, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO NOTHING
    `);

    const insertMemberOnly = db.prepare(`
        INSERT INTO members (group_id, user_jid, phone, display_name, joined_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(group_id, user_jid) DO NOTHING
    `);

    insertGroupOnly.run("12345@g.us", "Reclutamiento", Date.now());

    insertMemberOnly.run(
        "12345@g.us",
        "573007778899@s.whatsapp.net",
        "+57 300 777 8899",
        "Charlie",
        Date.now()
    );

    const result = reports.generateInactiveMembersReport(env.reportDefaultDays);

    logger.info(
    {
        totalInactivos: result.total,
        txt: result.txtPath,
        csv: result.csvPath
    },
    "Simulacion finalizada"
    );

    db.close();
}

main();
