const { getGroupAdminStatus } = require("../helpers");

async function getTargetJid(sock, msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned[0];

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return quoted;

  if (args[0]) {
    const num = args[0].replace(/[^0-9]/g, "");
    if (num) return `${num}@s.whatsapp.net`;
  }

  return null;
}

module.exports = {
  kick: async (sock, msg, from, args, sender) => {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ Amri hii inafanya kazi kwenye group tu." }, { quoted: msg });
    }

    const { isBotAdmin, isSenderAdmin } = await getGroupAdminStatus(sock, from, sender);
    if (!isSenderAdmin) return sock.sendMessage(from, { text: "❌ Ni admin pekee wanaoweza kutumia amri hii." }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: "❌ Nifanye admin kwanza ili niweze kutoa watu." }, { quoted: msg });

    const target = await getTargetJid(sock, msg, args);
    if (!target) return sock.sendMessage(from, { text: "❌ Tag mtu au reply ujumbe wake. Mfano: .kick @jina" }, { quoted: msg });

    await sock.groupParticipantsUpdate(from, [target], "remove");
    await sock.sendMessage(from, { text: "✅ Mtu ametolewa kwenye group." });
  },

  promote: async (sock, msg, from, args, sender) => {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ Amri hii inafanya kazi kwenye group tu." }, { quoted: msg });
    }

    const { isBotAdmin, isSenderAdmin } = await getGroupAdminStatus(sock, from, sender);
    if (!isSenderAdmin) return sock.sendMessage(from, { text: "❌ Ni admin pekee wanaoweza kutumia amri hii." }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: "❌ Nifanye admin kwanza." }, { quoted: msg });

    const target = await getTargetJid(sock, msg, args);
    if (!target) return sock.sendMessage(from, { text: "❌ Tag mtu au reply ujumbe wake. Mfano: .promote @jina" }, { quoted: msg });

    await sock.groupParticipantsUpdate(from, [target], "promote");
    await sock.sendMessage(from, { text: "✅ Mtu amefanywa admin." });
  },

  demote: async (sock, msg, from, args, sender) => {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ Amri hii inafanya kazi kwenye group tu." }, { quoted: msg });
    }

    const { isBotAdmin, isSenderAdmin } = await getGroupAdminStatus(sock, from, sender);
    if (!isSenderAdmin) return sock.sendMessage(from, { text: "❌ Ni admin pekee wanaoweza kutumia amri hii." }, { quoted: msg });
    if (!isBotAdmin) return sock.sendMessage(from, { text: "❌ Nifanye admin kwanza." }, { quoted: msg });

    const target = await getTargetJid(sock, msg, args);
    if (!target) return sock.sendMessage(from, { text: "❌ Tag mtu au reply ujumbe wake. Mfano: .demote @jina" }, { quoted: msg });

    await sock.groupParticipantsUpdate(from, [target], "demote");
    await sock.sendMessage(from, { text: "✅ Uadmin wa mtu umeondolewa." });
  },
};
