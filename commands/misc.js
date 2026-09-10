const config = require("../config");
const { isOwner, boldify } = require("../helpers");
// NOTE: require ya "../sessionManager" inafanyika ndani ya function (lazily)
// badala ya juu ya faili - sessionManager.js nayo inahitaji handler.js
// (ambayo inahitaji commands hizi), hivyo require ya juu ingesababisha
// "circular dependency" na kupata undefined kwa getSessionsSummary/activeCount.

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
  // .owner - tuma namba/mawasiliano ya owner wa bot
  owner: async (sock, msg, from) => {
    const numbers = config.OWNER_NUMBERS.map((n) => `wa.me/${n}`).join("\n");
    await sock.sendMessage(
      from,
      { text: `👑 ${boldify("Owner wa Bot")}\n${numbers}` },
      { quoted: msg }
    );
  },

  // .runtime - muda ambao process imekuwa ikiendesha
  runtime: async (sock, msg, from) => {
    await sock.sendMessage(
      from,
      { text: `⏱️ ${boldify("Runtime")}: ${formatUptime(process.uptime())}` },
      { quoted: msg }
    );
  },

  // .jid - onyesha JID ya chat (muhimu kwa debugging / group id)
  jid: async (sock, msg, from) => {
    await sock.sendMessage(from, { text: `🆔 JID: ${from}` }, { quoted: msg });
  },

  // .listsession - (owner pekee) onyesha session zote zinazoendesha kwa sasa
  listsession: async (sock, msg, from, args, sender) => {
    if (!isOwner(sender)) {
      return sock.sendMessage(from, { text: "❌ Amri hii ni ya owner pekee." }, { quoted: msg });
    }

    const { getSessionsSummary, activeCount } = require("../sessionManager");
    const summary = getSessionsSummary();
    if (!summary.length) {
      return sock.sendMessage(from, { text: "Hakuna session inayoendesha kwa sasa." }, { quoted: msg });
    }

    const lines = summary
      .map((s, i) => `${i + 1}. ${s.number} — ${s.status}`)
      .join("\n");

    await sock.sendMessage(
      from,
      {
        text: `👥 ${boldify("Session Zinazoendesha")} (${activeCount()}/${config.MAX_SESSIONS})\n${lines}`,
      },
      { quoted: msg }
    );
  },
};
