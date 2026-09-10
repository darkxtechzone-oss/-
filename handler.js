const config = require("./config");
const general = require("./commands/general");
const downloader = require("./commands/downloader");
const group = require("./commands/group");
const status = require("./commands/status");

const commands = {
  menu: general.menu,
  ping: general.ping,
  info: general.info,
  yt: downloader.yt,
  tiktok: downloader.tiktok,
  ig: downloader.ig,
  kick: group.kick,
  promote: group.promote,
  demote: group.demote,
  autostatus: status.autostatus,
};

async function handleMessage(sock, msg) {
  if (!msg.message) return;
  if (msg.key.fromMe) return; // Usijibu ujumbe wa bot mwenyewe

  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const body =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    "";

  if (!body.startsWith(config.PREFIX)) return;

  const args = body.slice(config.PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = commands[commandName];
  if (!command) return;

  try {
    await command(sock, msg, from, args, sender);
  } catch (err) {
    console.error(`Hitilafu kwenye amri "${commandName}":`, err);
    await sock.sendMessage(from, { text: "❌ Kuna hitilafu imetokea wakati wa kutekeleza amri." }, { quoted: msg });
  }
}

module.exports = { handleMessage };
