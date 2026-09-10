const fs = require("fs");
const config = require("../config");
const { boldify } = require("../helpers");

module.exports = {
  menu: async (sock, msg, from) => {
    const menuText = `
👑 ${boldify(config.BOT_NAME)} 👑
${boldify("Prefix")}: *${config.PREFIX}*

${boldify("📋 Amri za Msingi")}
${config.PREFIX}menu - Onyesha menu hii
${config.PREFIX}ping - Angalia speed ya bot
${config.PREFIX}info - Taarifa za bot

${boldify("⬇️ Downloader")}
${config.PREFIX}yt <link> - Pakua video ya YouTube
${config.PREFIX}tiktok <link> - Pakua video ya TikTok (bila logo)
${config.PREFIX}ig <link> - Pakua video/photo ya Instagram

${boldify("👥 Usimamizi wa Group")} (Admin only)
${config.PREFIX}kick @tag - Toa mtu kwenye group
${config.PREFIX}promote @tag - Fanya mtu admin
${config.PREFIX}demote @tag - Ondoa uadmin

${boldify("✨ Status")}
${config.PREFIX}autostatus on/off - Washa/Zima kuona na kupenda status (owner)

${boldify("🧩 Nyingine")}
${config.PREFIX}owner - Mawasiliano ya owner
${config.PREFIX}runtime - Muda bot imekuwa ikiendesha
${config.PREFIX}jid - Onyesha JID ya chat hii
${config.PREFIX}listsession - Session zinazoendesha (owner)

_${boldify("Imetengenezwa kwa ❤️")}_`.trim();

    if (fs.existsSync(config.MENU_IMAGE)) {
      await sock.sendMessage(
        from,
        { image: fs.readFileSync(config.MENU_IMAGE), caption: menuText },
        { quoted: msg }
      );
    } else {
      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }
  },

  ping: async (sock, msg, from) => {
    const start = Date.now();
    await sock.sendMessage(from, { text: "🏓 Inapima speed..." }, { quoted: msg });
    const latency = Date.now() - start;
    await sock.sendMessage(from, { text: `🏓 Pong! *${latency}ms*` });
  },

  info: async (sock, msg, from) => {
    const infoText = `
👑 ${boldify(config.BOT_NAME)}
Library: Baileys (@whiskeysockets/baileys)
Status: Online ✅

Andika *${config.PREFIX}menu* kuona amri zote.`.trim();

    await sock.sendMessage(from, { text: infoText }, { quoted: msg });
  },
};
