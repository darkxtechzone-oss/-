const config = require("../config");
const { isOwner } = require("../helpers");

module.exports = {
  autostatus: async (sock, msg, from, args, sender) => {
    if (!isOwner(sender)) {
      return sock.sendMessage(from, { text: "❌ Amri hii ni ya owner pekee." }, { quoted: msg });
    }

    const choice = (args[0] || "").toLowerCase();
    if (choice !== "on" && choice !== "off") {
      return sock.sendMessage(
        from,
        { text: `Matumizi: ${config.PREFIX}autostatus on/off` },
        { quoted: msg }
      );
    }

    const enabled = choice === "on";
    config.AUTO_VIEW_STATUS = enabled;
    config.AUTO_LIKE_STATUS = enabled;

    await sock.sendMessage(
      from,
      { text: `✅ Kuona na kupenda status ku${enabled ? "washwa" : "zimwa"}.` },
      { quoted: msg }
    );
  },
};
