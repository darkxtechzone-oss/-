const http = require("http");
const path = require("path");
const express = require("express");
const session = require("express-session");
const { Server } = require("socket.io");

const config = require("./config");
const {
  startSession,
  getSessionsSummary,
  activeCount,
  forceLogoutSession,
  setIO,
} = require("./sessionManager");

// Middleware inayolinda kila route ya /admin isipokuwa /admin/login
function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ ok: false, error: "Huna ruhusa. Ingia kwanza /admin." });
}

function startWebServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/image", express.static(path.join(__dirname, "image")));

  app.use(
    session({
      secret: config.ADMIN_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 8 * 60 * 60 * 1000 }, // saa 8
    })
  );

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pair.html"));
  });

  app.get("/api/sessions", (req, res) => {
    res.json({ active: activeCount(), max: config.MAX_SESSIONS, botName: config.BOT_NAME });
  });

  // ---------------- /admin ----------------
  const adminRouter = express.Router();

  adminRouter.get("/", (req, res) => {
    if (!req.session?.isAdmin) {
      return res.sendFile(path.join(__dirname, "admin-login.html"));
    }
    res.sendFile(path.join(__dirname, "admin.html"));
  });

  adminRouter.post("/login", (req, res) => {
    const { password } = req.body || {};
    if (password && password === config.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: "Password si sahihi." });
  });

  adminRouter.post("/logout", (req, res) => {
    req.session?.destroy(() => {});
    res.json({ ok: true });
  });

  adminRouter.get("/api/sessions", requireAdmin, (req, res) => {
    res.json({
      botName: config.BOT_NAME,
      max: config.MAX_SESSIONS,
      active: activeCount(),
      sessions: getSessionsSummary(),
    });
  });

  adminRouter.post("/api/sessions/:id/logout", requireAdmin, async (req, res) => {
    try {
      await forceLogoutSession(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use("/admin", adminRouter);

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
    console.log(`🔐 Admin Panel: http://localhost:${config.WEB_PORT}/admin`);
  });
}

module.exports = { startWebServer };
