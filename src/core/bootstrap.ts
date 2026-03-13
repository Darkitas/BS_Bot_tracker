import { env } from "../config/env";
import { logger } from "../config/logger";
import { createDatabase } from "../db/database";
import { ReportService } from "../services/report.service";
import { TrackingService } from "../services/tracking.service";

export function bootstrapApp(): void {
    const db = createDatabase(env.dbPath);
    const tracking = new TrackingService(db);
    const report = new ReportService(db, env.reportOutputDir);

    logger.info(
    {
        botName: env.botName,
        timezone: env.timezone,
        dbPath: env.dbPath,
        services: {
            tracking: Boolean(tracking),
            report: Boolean(report)
        }
    },
    "Bot inicializado en modo base"
    );
}
