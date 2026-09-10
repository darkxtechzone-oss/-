const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
  delay,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

const config = require("./config");
const { handleMessage } = require("./handler");
// Session (creds/keys) sasa zinahifadhiwa MongoDB badala ya faili za lokali -
// hii inaruhusu bot kutokupoteza session bot ikianzishwa upya / ku-redeploy.
const { useMongoAuthState, listRegisteredSessionIds } = require("./mongoAuthState");

// sessionId -> { sock, status, number, qr, pairingCode }
const sessions = new Map();

// socket.io server instance, injected by webserver.js so we can push
// real-time pairing codes / connection events straight to the browser
// instead of making the page poll and wait.
let ioRef = null;
function setIO(io) {
  ioRef = io;
}

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
    startedAt: s.startedAt,
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

  let { state, saveCreds, clearSession } = await useMongoAuthState(sessionId);

  // Kama session ilikuwa na creds "chakavu" kutoka jaribio lililoshindwa
  // (haijasajiliwa kikamilifu), ifute MongoDB na uanze mpya kabisa - creds
  // za zamani zinaweza kusababisha WhatsApp kukataa pairing code mpya.
  if (!state.creds.registered) {
    await clearSession();
    ({ state, saveCreds, clearSession } = await useMongoAuthState(sessionId));
  }
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`🧩 Baileys version: ${version.join(".")} (latest: ${isLatest})`);

  // MUHIMU (chanzo cha error ya awali): WhatsApp ilibadilisha protocol ya
  // pairing code na Baileys 6.x ilianza kutengeneza code zisizofanya kazi
  // ("Couldn't link device" / socket kufa kabla code kutumika). Muundo huu
  // umechukuliwa moja kwa moja kutoka WA-BASE-BOT (inayotumia Baileys 7.x
  // na inafanya kazi kikamilifu), tofauti pekee ni kwamba hapa tunatumia
  // fingerprint moja thabiti ("ubuntu-chrome" wingi wa muda) badala ya
  // random ili kupunguza uwezekano wa WhatsApp kuchanganyikiwa kati ya
  // session nyingi zinazoendesha kwa wakati mmoja (multi-session ya Queen).
  const browserOptions = [
    Browsers.ubuntu("Chrome"),
    Browsers.macOS("Safari"),
    Browsers.macOS("Chrome"),
    Browsers.windows("Firefox"),
    Browsers.macOS("Edge"),
  ];
  const chosenBrowser = browserOptions[Math.floor(Math.random() * browserOptions.length)];

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      // Cacheable signal key store: Baileys' recommended pattern for the
      // auth keys - improves reliability of the encryption/registration
      // handshake and was the key difference vs. the reference project
      // that pairs successfully 100% of the time.
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: chosenBrowser,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async () => undefined,
    syncFullHistory: false,
    // --- Uthabiti wa muunganiko (huzuia socket kufa kabla code kutumika) ---
    keepAliveIntervalMs: 20_000,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    qrTimeout: 60_000,
    emitOwnEvents: true,
    retryRequestDelayMs: 2_000,
    maxMsgRetryCount: 5,
  });

  const record = {
    sock,
    status: "connecting",
    number: sessionId,
    pairingCode: null,
    startedAt: Date.now(),
    clearSession,
  };
  sessions.set(sessionId, record);

  // Omba pairing code endapo bado hatujasajiliwa (hatuhitaji QR)
  if (!state.creds.registered) {
    // Baileys inahitaji socket iwe imeanza "connecting" kabla ya kuomba
    // pairing code, la sivyo WhatsApp inarudisha code ambayo haifanyi kazi
    // au inatupa error ya "Precondition Required". Tunasubiri tukio la
    // kwanza la connection.update (au delay fupi kama fallback) kabla
    // ya kuomba code - hii ndiyo tofauti kuu iliyokuwa inakosekana.
    const requestCode = async (attempt = 1) => {
      try {
        await delay(attempt === 1 ? 2000 : 3000);
        const code = await sock.requestPairingCode(sessionId);
        record.pairingCode = code;
        record.pairingCodeIssuedAt = Date.now();
        if (onPairingCode) onPairingCode(code);
      } catch (err) {
        console.error(`Imeshindwa kutengeneza pairing code (jaribio ${attempt}):`, err?.message || err);
        if (attempt < 2) {
          // Jaribu tena mara moja kwa delay ndefu zaidi - mara nyingi jaribio
          // la kwanza hushindwa kwa sababu socket haijawa tayari kabisa.
          return requestCode(attempt + 1);
        }
        record.status = "error";
        if (onPairingCode) onPairingCode(null, err);
      }
    };
    requestCode();
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      record.status = "connected";
      console.log(`✅ ${config.BOT_NAME} (${sessionId}) imeunganishwa kikamilifu!`);
      if (ioRef) ioRef.emit("connected", { number: sessionId });
    } else if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        record.status = "logged_out";
        sessions.delete(sessionId);
        clearSession().catch((err) =>
          console.error(`Imeshindwa kufuta session ${sessionId} kwenye MongoDB:`, err.message)
        );
        console.log(`⚠️ Session ${sessionId} imetoka (logged out) na imefutwa.`);
        if (ioRef) ioRef.emit("disconnected", { number: sessionId, willReconnect: false });
      } else {
        record.status = "reconnecting";
        console.log(`⚠️ Session ${sessionId} imekatika, inaunganishwa upya...`);
        if (ioRef) ioRef.emit("disconnected", { number: sessionId, willReconnect: true });
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
// - sasa zinasomwa kutoka MongoDB badala ya folda ya lokali "session/".
async function resumeExistingSessions() {
  let sessionIds = [];
  try {
    sessionIds = await listRegisteredSessionIds();
  } catch (err) {
    console.error("Imeshindwa kusoma session kutoka MongoDB:", err.message);
    return;
  }

  for (const sessionId of sessionIds.slice(0, config.MAX_SESSIONS)) {
    try {
      await startSession(sessionId);
    } catch (err) {
      console.error(`Imeshindwa kurudisha session ${sessionId}:`, err.message);
    }
  }
}

// Inatumika na /admin panel kulazimisha session itoke (logout) na kufutwa
// kabisa kwenye MongoDB.
async function forceLogoutSession(sessionId) {
  const id = cleanNumber(sessionId);
  const record = sessions.get(id);

  if (record) {
    try {
      record.sock?.logout?.();
    } catch (_) {}
    try {
      record.sock?.end?.(undefined);
    } catch (_) {}
    sessions.delete(id);
    if (record.clearSession) {
      await record.clearSession();
      return true;
    }
  }

  // Session haipo "live" kwenye kumbukumbu (mfano bot imeanzishwa upya),
  // lakini bado inaweza kuwa na creds MongoDB - ifute moja kwa moja.
  const { clearSession } = await useMongoAuthState(id);
  await clearSession();
  return true;
}

module.exports = {
  startSession,
  getSession,
  getSessionsSummary,
  resumeExistingSessions,
  forceLogoutSession,
  activeCount,
  setIO,
};
