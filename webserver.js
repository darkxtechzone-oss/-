const path = require("path");
const express = require("express");

const config = require("./config");
const { startSession, getSessionsSummary, activeCount } = require("./sessionManager");

function startWebServer() {
  const app = express();
  app.use(express.json());
  app.use("/image", express.static(path.join(__dirname, "image")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pair.html"));
  });

  app.get("/api/sessions", (req, res) => {
    res.json({ active: activeCount(), max: config.MAX_SESSIONS, botName: config.BOT_NAME });
  });

  app.post("/api/pair", async (req, res) => {
    const { number } = req.body || {};
    if (!number || !/^\d{9,15}$/.test(String(number).replace(/[^0-9]/g, ""))) {
      return res.status(400).json({ error: "Weka namba sahihi ya WhatsApp (mfano: 255712345678)." });
    }

    try {
      let code = null;
      const record = await startSession(number, {
        onPairingCode: (c) => {
          code = c;
        },
      });

      // Subiri kidogo kama code bado haijatengenezwa
      for (let i = 0; i < 20 && !code && !record.pairingCode; i++) {
        await new Promise((r) => setTimeout(r, 300));
      }
      code = code || record.pairingCode;

      if (!code) {
        return res.status(500).json({ error: "Imeshindwa kutengeneza pairing code. Jaribu tena." });
      }

      return res.json({ code, botName: config.BOT_NAME });
    } catch (err) {
      const status = err.code === "SESSIONS_FULL" ? 429 : 500;
      return res.status(status).json({ error: err.message || "Hitilafu isiyojulikana." });
    }
  });

  app.listen(config.WEB_PORT, () => {
    console.log(`🌐 Ukurasa wa Pairing: http://localhost:${config.WEB_PORT}`);
  });
}

module.exports = { startWebServer };
