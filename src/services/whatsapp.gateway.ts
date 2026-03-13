import makeWASocket, {
    Browsers,
    DisconnectReason,
    getContentType,
    useMultiFileAuthState,
    type WAMessage
} from "@whiskeysockets/baileys";
import path from "node:path";
import pino from "pino";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ReportService } from "./report.service";
import { TrackingService } from "./tracking.service";

type GatewayOptions = {
    trackingService: TrackingService;
    reportService: ReportService;
};

export async function startWhatsAppGateway(options: GatewayOptions): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(env.authDir);
    const tracking = options.trackingService;
    const report = options.reportService;
    const groupNames = new Map<string, string>();

    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu(env.botName),
        printQRInTerminal: !env.usePairingCode,
        markOnlineOnConnect: false,
        logger: pino({ level: env.logLevel })
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("groups.update", (updates) => {
        for (const update of updates) {
            if (update.id && update.subject) {
                groupNames.set(update.id, update.subject);
            }
        }
    });

    sock.ev.on("groups.upsert", (groups) => {
        for (const group of groups) {
            if (group.id && group.subject) {
                groupNames.set(group.id, group.subject);
            } 
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") {
            return;
        }

        for (const message of messages) {
            registerMessageIfTrackable(message, tracking, groupNames);
            await handleGroupCommand(message, report, sock);
        }
    });

    sock.ev.on("group-participants.update", async (event) => {
        if (!env.welcomeEnabled || event.action !== "add") {
            return;
        }

        if (!shouldSendWelcome(event.id)) {
            return;
        }

        const participantJids = event.participants
            .map((participant) =>
                typeof participant === "string"
                    ? participant
                    : participant.id ?? ""
            )
            .filter((jid): jid is string => jid.endsWith("@s.whatsapp.net"));

        if (participantJids.length === 0) {
            return;
        }

        const mentionsText = participantJids.map((jid) => `@${jidToPhone(jid)}`).join(" ");
        const welcomeText = `${mentionsText}\n\n${env.welcomeTemplate}`;

        await sock.sendMessage(event.id, {
            text: welcomeText,
            mentions: participantJids
        });
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

    if (env.usePairingCode && !sock.authState.creds.registered && env.pairingPhoneNumber) {
        const pairingCode = await sock.requestPairingCode(env.pairingPhoneNumber);
        logger.info({ pairingCode }, "Codigo de vinculacion generado");
    }

    if (connection === "open") {
        logger.info("Conexion WhatsApp abierta");
        return;
    }

    if (connection !== "close") {
        return;
    }

    const statusCode =
        ((lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode) ??
        -1;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

    logger.warn({ statusCode, shouldReconnect }, "Conexion WhatsApp cerrada");

    if (shouldReconnect) {
        setTimeout(() => {
            void startWhatsAppGateway(options);
        }, 2_000);
    }
    });
}

async function handleGroupCommand(
    message: WAMessage,
    reportService: ReportService,
    sock: ReturnType<typeof makeWASocket>
): Promise<void> {
    const remoteJid = message.key.remoteJid;
    if (!remoteJid || !remoteJid.endsWith("@g.us") || message.key.fromMe) {
        return;
    }

    const text = extractMessageText(message)?.trim();
    if (!text) {
        return;
    }

    if (parseStatusCommand(text)) {
        await respondStatusCommand(remoteJid, message, sock);
        return;
    }

    const commandData = parseReportCommand(text);
    if (!commandData) {
        return;
    }

    try {
        const result = reportService.generateInactiveMembersReport(commandData.days);
        await sock.sendMessage(
            remoteJid,
            {
                text:
                    `Reporte generado para ${commandData.days} dias.\n` +
                    `Inactivos detectados: ${result.total}`
            },
            { quoted: message }
        );

        await sock.sendMessage(remoteJid, {
            document: { url: result.csvPath },
            fileName: path.basename(result.csvPath),
            mimetype: "text/csv"
        });

        await sock.sendMessage(remoteJid, {
            document: { url: result.txtPath },
            fileName: path.basename(result.txtPath),
            mimetype: "text/plain"
        });
    } catch (error) {
        logger.error({ error }, "Error ejecutando comando de reporte");
        await sock.sendMessage(
            remoteJid,
            { text: "No pude generar el reporte en este momento." },
            { quoted: message }
        );
    }
}

async function respondStatusCommand(
    remoteJid: string,
    quotedMessage: WAMessage,
    sock: ReturnType<typeof makeWASocket>
): Promise<void> {
    const statusText = [
        "Estado del bot:",
        `- Runtime: ${env.runtimeMode}`,
        `- Timezone: ${env.timezone}`,
        `- DB: ${env.dbPath}`,
        `- Reporte por defecto: ${env.reportDefaultDays} dias`,
        "",
        "Comandos:",
        `- ${env.commandPrefix}${env.reportCommandKeyword} 30`,
        `- ${env.commandPrefix}estado`
    ].join("\n");

    await sock.sendMessage(
        remoteJid,
        { text: statusText },
        { quoted: quotedMessage }
    );
}

function parseReportCommand(text: string): { days: number } | null {
    const escapedPrefix = escapeRegExp(env.commandPrefix);
    const escapedKeyword = escapeRegExp(env.reportCommandKeyword);

    const prefixed = new RegExp(`^${escapedPrefix}${escapedKeyword}(?:\\s+(\\d{1,3}))?$`, "i");
    const plain = new RegExp(`^${escapedKeyword}(?:\\s+(\\d{1,3}))?$`, "i");

    const match = text.match(prefixed) ?? text.match(plain);
    if (!match) {
        return null;
    }

    const parsedDays = match[1] ? Number(match[1]) : env.reportDefaultDays;
    const days = Number.isFinite(parsedDays) ? Math.max(1, Math.min(parsedDays, 365)) : env.reportDefaultDays;

    return { days };
}

function parseStatusCommand(text: string): boolean {
    const escapedPrefix = escapeRegExp(env.commandPrefix);
    const prefixed = new RegExp(`^${escapedPrefix}estado$`, "i");
    const plain = /^estado$/i;

    return prefixed.test(text) || plain.test(text);
}

function shouldSendWelcome(groupId: string): boolean {
    if (env.welcomeGroupIds.length === 0) {
        return true;
    }

    return env.welcomeGroupIds.includes(groupId);
}

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function registerMessageIfTrackable(
    message: WAMessage,
    tracking: TrackingService,
    groupNames: Map<string, string>
): void {
    const remoteJid = message.key.remoteJid;

    if (!remoteJid || !remoteJid.endsWith("@g.us")) {
        return;
    }

    if (message.key.fromMe) {
        return;
    }

    const senderJid = message.key.participant ?? message.participant;
    if (!senderJid || !senderJid.endsWith("@s.whatsapp.net")) {
        return;
    }

    const messageId = message.key.id;
    if (!messageId) {
        return;
    }

    const timestampSeconds = Number(message.messageTimestamp ?? 0);
    const sentAt = timestampSeconds > 0 ? timestampSeconds * 1000 : Date.now();
    const body = extractMessageText(message);

    const payload: {
        messageId: string;
        groupId: string;
        groupName: string;
        userJid: string;
        phone: string;
        sentAt: number;
        displayName?: string;
        body?: string;
    } = {
        messageId,
        groupId: remoteJid,
        groupName: groupNames.get(remoteJid) ?? remoteJid,
        userJid: senderJid,
        phone: jidToPhone(senderJid),
        sentAt
    };

    const displayName = normalizeOptionalString(message.pushName);
    if (displayName) {
        payload.displayName = displayName;
    }

    if (body) {
        payload.body = body;
    }

    tracking.registerMessage(payload);
}

function extractMessageText(message: WAMessage): string | undefined {
    const messageContent = message.message ?? undefined;
    const contentType = getContentType(messageContent);

    if (!contentType || !messageContent) {
        return undefined;
    }

    if (contentType === "conversation") {
        return normalizeOptionalString(messageContent.conversation);
    }

    if (contentType === "extendedTextMessage") {
        return normalizeOptionalString(messageContent.extendedTextMessage?.text);
    }

    if (contentType === "imageMessage") {
        return normalizeOptionalString(messageContent.imageMessage?.caption);
    }

    if (contentType === "videoMessage") {
        return normalizeOptionalString(messageContent.videoMessage?.caption);
    }

    return undefined;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    return value;
}

function jidToPhone(jid: string): string {
    return jid.replace("@s.whatsapp.net", "");
}
