import dotenv from "dotenv";

dotenv.config();

export type AppEnv = {
  botName: string;
  timezone: string;
  reportDefaultDays: number;
  reportOutputDir: string;
  authDir: string;
  dbPath: string;
};

export const env: AppEnv = {
  botName: process.env.BOT_NAME ?? "tracker-bot",
  timezone: process.env.TIMEZONE ?? "America/Bogota",
  reportDefaultDays: Number(process.env.REPORT_DEFAULT_DAYS ?? 60),
  reportOutputDir: process.env.REPORT_OUTPUT_DIR ?? "reports",
  authDir: process.env.AUTH_DIR ?? "auth",
  dbPath: process.env.DB_PATH ?? "data/tracker.db"
};
