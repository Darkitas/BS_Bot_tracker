import { env } from "../config/env";
import { logger } from "../config/logger";
import { createDatabase } from "../db/database";
import { ReportService } from "../services/report.service";
import { TrackingService } from "../services/tracking.service";
import { startWhatsAppGateway } from "../services/whatsapp.gateway";

export async function bootstrapApp(): Promise<void> {
    const db = createDatabase(env.dbPath);
    const tracking = new TrackingService(db);
    const report = new ReportService(db, env.reportOutputDir);

    logger.info(
    {
        botName: env.botName,
        timezone: env.timezone,
        dbPath: env.dbPath,
        runtimeMode: env.runtimeMode,
        services: {
            tracking: Boolean(tracking),
            report: Boolean(report)
        }
    },
    "Bot inicializado"
    );

    if (env.runtimeMode === "whatsapp") {
        await startWhatsAppGateway({
            trackingService: tracking,
            reportService: report
        });
        logger.info("Gateway de WhatsApp activo");
        return;
    }

    logger.info("Modo local activo (sin conexion a WhatsApp)");
}
