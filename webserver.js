const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const config = require("./config");
const { startSession, getSessionsSummary, activeCount, setIO } = require("./sessionManager");

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

  const server = http.createServer(app);
  const io = new Server(server);
  setIO(io);

  io.on("connection", (socket) => {
    socket.on("pair-request", async (rawNumber) => {
      const number = String(rawNumber || "").replace(/[^0-9]/g, "");

      if (!number || number.length < 9) {
        socket.emit("pairing-error", { error: "Weka namba sahihi ya WhatsApp (mfano: 255712345678)." });
        return;
      }

      try {
        socket.emit("status", { message: `✨ Inatengeneza pairing code kwa ${number}...` });

        await startSession(number, {
          onPairingCode: (code, err) => {
            if (err || !code) {
              socket.emit("pairing-error", {
                error: err?.message || "Imeshindwa kutengeneza pairing code. Jaribu tena.",
              });
              return;
            }
            socket.emit("pairing-code", { number, code });
          },
        });
      } catch (err) {
        const isFull = err.code === "SESSIONS_FULL";
        socket.emit("pairing-error", {
          error: err.message || (isFull ? "Session zimejaa." : "Hitilafu isiyojulikana."),
        });
      }
    });
  });

  server.listen(config.WEB_PORT, () => {
    console.log(`🌐 Ukurasa wa Pairing: http://localhost:${config.WEB_PORT}`);
  });
}

module.exports = { startWebServer };
