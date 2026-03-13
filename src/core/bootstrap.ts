import { env } from "../config/env";
import { logger } from "../config/logger";

export function bootstrapApp(): void {
  logger.info(
    {
      botName: env.botName,
      timezone: env.timezone,
      dbPath: env.dbPath
    },
    "Esqueleto del bot cargado"
  );
}
