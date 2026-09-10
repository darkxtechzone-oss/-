const config = require("./config");
const { resumeExistingSessions } = require("./sessionManager");
const { startWebServer } = require("./webserver");

async function main() {
  console.log(`👑 Inaanzisha ${config.BOT_NAME} ...`);

  // Rudisha session zilizokuwa zimeunganishwa kabla (mpaka MAX_SESSIONS)
  await resumeExistingSessions();

  // Anzisha seva ya wavuti kwa ajili ya pairing (namba -> pairing code)
  startWebServer();
}

main().catch((err) => {
  console.error("Hitilafu kubwa:", err);
  process.exit(1);
});
