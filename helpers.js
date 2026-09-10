const config = require("./config");

// Angalia kama namba (JID) ni owner wa bot
function isOwner(jid) {
  const number = jid.split("@")[0];
  return config.OWNER_NUMBERS.includes(number);
}

// Pata taarifa za group na uangalie kama bot na muhusika ni admin
async function getGroupAdminStatus(sock, groupJid, participantJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const participants = metadata.participants;

  const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  const bot = participants.find((p) => p.id.split(":")[0] + "@s.whatsapp.net" === botJid);
  const sender = participants.find((p) => p.id === participantJid);

  return {
    metadata,
    isBotAdmin: bot?.admin === "admin" || bot?.admin === "superadmin",
    isSenderAdmin: sender?.admin === "admin" || sender?.admin === "superadmin",
  };
}

// Chukua namba tu kutoka kwenye JID (bila @s.whatsapp.net)
function jidToNumber(jid) {
  return jid.split("@")[0].split(":")[0];
}

// ---- Fonti nzito (bold) za Unicode kwa ajili ya menu / majina ----
// Hii inabadilisha herufi za kawaida (A-Z, a-z, 0-9) kuwa "Mathematical Sans Bold"
// ili ujumbe uonekane BOLD kwenye WhatsApp bila kutegemea font ya app.
const BOLD_MAP = (() => {
  const map = {};
  const upperStart = 0x1d5d4; // 𝗔
  const lowerStart = 0x1d5ee; // 𝗮
  const digitStart = 0x1d7ec; // 𝟬
  for (let i = 0; i < 26; i++) {
    map[String.fromCharCode(65 + i)] = String.fromCodePoint(upperStart + i);
    map[String.fromCharCode(97 + i)] = String.fromCodePoint(lowerStart + i);
  }
  for (let i = 0; i < 10; i++) {
    map[String.fromCharCode(48 + i)] = String.fromCodePoint(digitStart + i);
  }
  return map;
})();

function boldify(text) {
  return String(text)
    .split("")
    .map((ch) => BOLD_MAP[ch] || ch)
    .join("");
}

module.exports = { isOwner, getGroupAdminStatus, jidToNumber, boldify };
