const ytdl = require("@distube/ytdl-core");
const axios = require("axios");
const config = require("../config");

module.exports = {
  yt: async (sock, msg, from, args) => {
    const url = args[0];
    if (!url || !ytdl.validateURL(url)) {
      return sock.sendMessage(from, { text: "❌ Tuma link sahihi ya YouTube.\nMfano: .yt https://youtu.be/xxxx" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: "⏳ Napakua video, subiri kidogo..." }, { quoted: msg });

      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;

      const format = ytdl.chooseFormat(info.formats, { quality: "18" }); // 360p yenye sauti

      const stream = ytdl(url, { format });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await sock.sendMessage(
        from,
        { video: buffer, caption: `🎬 *${title}*`, mimetype: "video/mp4" },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: "❌ Imeshindwa kupakua. Jaribu link nyingine au video fupi zaidi." }, { quoted: msg });
    }
  },

  tiktok: async (sock, msg, from, args) => {
    const url = args[0];
    if (!url) {
      return sock.sendMessage(from, { text: "❌ Tuma link sahihi ya TikTok.\nMfano: .tiktok https://vm.tiktok.com/xxxx" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: "⏳ Napakua video ya TikTok..." }, { quoted: msg });

      // NOTE: Badilisha API hii na provider unayemtumia (RapidAPI, TikWM, n.k.)
      const { data } = await axios.get("https://www.tikwm.com/api/", { params: { url } });

      if (!data?.data?.play) throw new Error("Video haikupatikana");

      const videoUrl = data.data.play; // link bila logo
      const videoRes = await axios.get(videoUrl, { responseType: "arraybuffer" });

      await sock.sendMessage(
        from,
        { video: Buffer.from(videoRes.data), caption: `🎵 TikTok Downloader - ${config.BOT_NAME}` },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: "❌ Imeshindwa kupakua video ya TikTok. Hakikisha link ni sahihi." }, { quoted: msg });
    }
  },

  ig: async (sock, msg, from, args) => {
    const url = args[0];
    if (!url) {
      return sock.sendMessage(from, { text: "❌ Tuma link sahihi ya Instagram.\nMfano: .ig https://instagram.com/reel/xxxx" }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, { text: "⏳ Napakua kutoka Instagram..." }, { quoted: msg });

      const { data } = await axios.get("https://api.tiklydown.eu.org/api/download/ig", { params: { url } });

      const media = data?.data?.media || data?.media;
      if (!media) throw new Error("Media haikupatikana");

      const mediaRes = await axios.get(media, { responseType: "arraybuffer" });
      const isVideo = media.includes(".mp4");

      await sock.sendMessage(
        from,
        isVideo
          ? { video: Buffer.from(mediaRes.data), caption: `📸 Instagram Downloader - ${config.BOT_NAME}` }
          : { image: Buffer.from(mediaRes.data), caption: `📸 Instagram Downloader - ${config.BOT_NAME}` },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);
      await sock.sendMessage(
        from,
        { text: "❌ Imeshindwa kupakua kutoka Instagram. API ya IG mara nyingi hubadilika - unaweza kuhitaji kutumia huduma ya kulipia (RapidAPI)." },
        { quoted: msg }
      );
    }
  },
};
