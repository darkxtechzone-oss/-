module.exports = {
  // Jina la bot (linatumika kwenye menu, taarifa, na kichwa cha ukurasa wa pairing)
  BOT_NAME: "𝑸𝑼𝑬𝑬𝑵 𝑪𝒀𝑵𝑻𝑯𝑰𝑨",

  PREFIX: ".", // badilisha kama unataka alama nyingine, mfano "!" au "/"

  // Weka namba za owner (bila +, bila nafasi). Mfano: "255712345678"
  OWNER_NUMBERS: ["255700000000"],

  // Idadi kubwa ya session (namba/user) zinazoruhusiwa kuunganishwa kwa wakati mmoja
  MAX_SESSIONS: 3,

  // Status: bot ione status za watu kiotomatiki na kuzipenda (like)
  AUTO_VIEW_STATUS: true,
  AUTO_LIKE_STATUS: true,
  STATUS_LIKE_EMOJI: "💖",

  MENU_IMAGE: __dirname + "/image/menu.jpg",


  WELCOME_MESSAGE: (name, groupName) =>
    `👑 Karibu @${name} kwenye *${groupName}*!\nSoma sheria za group na ujisikie huru. 🎉`,
  GOODBYE_MESSAGE: (name, groupName) =>
    `👋 @${name} ameondoka kwenye *${groupName}*. Kwaheri!`,

  
  WEB_PORT: process.env.PORT || 3000,
  SOFTWARE_CREDIT: "this software provided by DarkX",

  // 
    process.env.MONGODB_URI ||
    "mongodb+srv://mrxdeveloper2_db_user:P0DWc9vFOXICW4aa@cluster0.8n43fok.mongodb.net/?appName=Cluster0",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "queen_cynthia",

  // Ukurasa wa /admin - unaomba password hii kabla ya kuingia.
  // Bora zaidi: badilisha kupitia env var ADMIN_PASSWORD badala ya kubadilisha
  // hapa moja kwa moja, na epuka kutumia password rahisi kwenye production.
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  ADMIN_SESSION_SECRET:
    process.env.ADMIN_SESSION_SECRET || "queen-cynthia-admin-secret-badilisha-hii",
};
