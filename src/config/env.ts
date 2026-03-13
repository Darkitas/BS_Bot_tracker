import dotenv from "dotenv";

dotenv.config();

export type AppEnv = {
    botName: string;
    timezone: string;
    logLevel: string;
    reportDefaultDays: number;
    reportOutputDir: string;
    authDir: string;
    dbPath: string;
    runtimeMode: "local" | "whatsapp";
    usePairingCode: boolean;
    pairingPhoneNumber: string | undefined;
    welcomeEnabled: boolean;
    welcomeGroupIds: string[];
    welcomeTemplate: string;
    commandPrefix: string;
    reportCommandKeyword: string;
};

function parseCsv(value: string | undefined): string[] {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseMultiline(value: string | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    return value.replaceAll("\\n", "\n");
}

export const env: AppEnv = {
    botName: process.env.BOT_NAME ?? "tracker-bot",
    timezone: process.env.TIMEZONE ?? "America/Bogota",
    logLevel: process.env.LOG_LEVEL ?? "info",
    reportDefaultDays: Number(process.env.REPORT_DEFAULT_DAYS ?? 60),
    reportOutputDir: process.env.REPORT_OUTPUT_DIR ?? "reports",
    authDir: process.env.AUTH_DIR ?? "auth",
    dbPath: process.env.DB_PATH ?? "data/tracker.db",
    runtimeMode: process.env.RUNTIME_MODE === "whatsapp" ? "whatsapp" : "local",
    usePairingCode: process.env.USE_PAIRING_CODE === "true",
    pairingPhoneNumber: process.env.PAIRING_PHONE_NUMBER,
    welcomeEnabled: process.env.WELCOME_ENABLED !== "false",
    welcomeGroupIds: parseCsv(process.env.WELCOME_GROUP_IDS),
    welcomeTemplate: parseMultiline(
        process.env.WELCOME_TEMPLATE,
        "Bienvenido/a a la comunidad.\n\nRellena esta ficha:\n- Nombre:\n- Edad:\n- ID del juego:"
    ),
    commandPrefix: process.env.COMMAND_PREFIX ?? "!",
    reportCommandKeyword: process.env.REPORT_COMMAND_KEYWORD ?? "reporte"
};
