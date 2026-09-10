const path = require("path");
const fs = require("fs");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  delay,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

const config = require("./config");
const { handleMessage } = require("./handler");

const SESSIONS_DIR = path.join(__dirname, "session");
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// sessionId -> { sock, status, number, qr, pairingCode }
const sessions = new Map();

function cleanNumber(number) {
  return String(number).replace(/[^0-9]/g, "");
}

function activeCount() {
  let count = 0;
  for (const s of sessions.values()) {
    if (s.status === "connected" || s.status === "connecting") count++;
  }
  return count;
}

function hasFreeSlot(sessionId) {
  if (sessions.has(sessionId)) return true; // reconnecting an existing session doesn't use a new slot
  return activeCount() < config.MAX_SESSIONS;
}

function getSessionsSummary() {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    id,
    number: s.number,
    status: s.status,
  }));
}

async function startSession(number, { onPairingCode } = {}) {
  const sessionId = cleanNumber(number);
  if (!sessionId) throw new Error("Namba si sahihi.");

  if (!hasFreeSlot(sessionId)) {
    const err = new Error(
      `Session zimejaa. Tunaruhusu watumiaji ${config.MAX_SESSIONS} tu kwa wakati mmoja. Jaribu tena baadaye.`
    );
    err.code = "SESSIONS_FULL";
    throw err;
  }

  // Kama session tayari ipo na imeunganishwa, usianzishe nyingine
  const existing = sessions.get(sessionId);
  if (existing && existing.status === "connected") {
    return existing;
  }

  // Kama kuna socket ya zamani ambayo bado haijaunganishwa (jaribio lililopita
  // halikukamilika), ifunge kabisa kabla ya kuanza upya - kuacha socket ya zamani
  // ikiwa wazi wakati mmoja na mpya ndiyo chanzo kikuu cha "Couldn't link device".
  if (existing) {
    try {
      existing.sock?.end?.(undefined);
    } catch (_) {}
    sessions.delete(sessionId);
  }

  const sessionDir = path.join(SESSIONS_DIR, sessionId);

  // Kama hakuna creds zilizosajiliwa kikamilifu bado, futa folda ya session
  // kuanza mpya kabisa (creds "chakavu" kutoka jaribio lililoshindwa zinaweza
  // kusababisha WhatsApp kukataa code mpya).
  const credsPath = path.join(sessionDir, "creds.json");
  if (fs.existsSync(sessionDir) && !fs.existsSync(credsPath)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } else if (fs.existsSync(credsPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      if (!creds.registered) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (_) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    // MUHIMU: pairing code (kuunganisha kwa namba) inahitaji fingerprint ya
    // browser inayotambulika na WhatsApp. Jina la kawaida (hata lenye emoji
    // au herufi maalum) linaweza kusababisha "Couldn't link device".
    browser: Browsers.ubuntu("Chrome"),
  });

  const record = { sock, status: "connecting", number: sessionId, pairingCode: null };
  sessions.set(sessionId, record);

  // Omba pairing code endapo bado hatujasajiliwa (hatuhitaji QR)
  if (!state.creds.registered) {
    try {
      await delay(1500);
      const code = await sock.requestPairingCode(sessionId);
      record.pairingCode = code;
      record.pairingCodeIssuedAt = Date.now();
      if (onPairingCode) onPairingCode(code);
    } catch (err) {
      console.error("Imeshindwa kutengeneza pairing code:", err);
      record.status = "error";
      if (onPairingCode) onPairingCode(null, err);
    }
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      record.status = "connected";
      console.log(`✅ ${config.BOT_NAME} (${sessionId}) imeunganishwa kikamilifu!`);
    } else if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        record.status = "logged_out";
        sessions.delete(sessionId);
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`⚠️ Session ${sessionId} imetoka (logged out) na imefutwa.`);
      } else {
        record.status = "reconnecting";
        console.log(`⚠️ Session ${sessionId} imekatika, inaunganishwa upya...`);
        startSession(sessionId).catch((e) => console.error(e));
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    // ---- Status (whatsapp status) auto view / like ----
    if (msg.key.remoteJid === "status@broadcast") {
      await handleStatus(sock, msg);
      return;
    }

    await handleMessage(sock, msg);
  });

  sock.ev.on("group-participants.update", async (update) => {
    const { id: groupJid, participants, action } = update;
    try {
      const metadata = await sock.groupMetadata(groupJid);
      const groupName = metadata.subject;

      for (const participant of participants) {
        const name = participant.split("@")[0];
        if (action === "add") {
          await sock.sendMessage(groupJid, {
            text: config.WELCOME_MESSAGE(name, groupName),
            mentions: [participant],
          });
        } else if (action === "remove") {
          await sock.sendMessage(groupJid, {
            text: config.GOODBYE_MESSAGE(name, groupName),
            mentions: [participant],
          });
        }
      }
    } catch (err) {
      console.error("Hitilafu kwenye welcome/goodbye:", err);
    }
  });

  return record;
}

async function handleStatus(sock, msg) {
  try {
    if (config.AUTO_VIEW_STATUS) {
      await sock.readMessages([msg.key]);
    }
    if (config.AUTO_LIKE_STATUS) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { react: { text: config.STATUS_LIKE_EMOJI, key: msg.key } },
        { statusJidList: [msg.key.participant] }
      );
    }
  } catch (err) {
    console.error("Hitilafu kwenye status view/like:", err);
  }
}

function getSession(sessionId) {
  return sessions.get(cleanNumber(sessionId));
}

// Restart session zilizokuwepo kabla ya bot kuzimwa (zenye creds tayari)
async function resumeExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter((d) =>
    fs.existsSync(path.join(SESSIONS_DIR, d, "creds.json"))
  );
  for (const sessionId of dirs.slice(0, config.MAX_SESSIONS)) {
    try {
      await startSession(sessionId);
    } catch (err) {
      console.error(`Imeshindwa kurudisha session ${sessionId}:`, err.message);
    }
  }
}

module.exports = {
  startSession,
  getSession,
  getSessionsSummary,
  resumeExistingSessions,
  activeCount,
};
