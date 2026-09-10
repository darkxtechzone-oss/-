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

  // Picha inayotumika kwenye ujumbe wa menu
  MENU_IMAGE: __dirname + "/image/menu.jpg",

  // Ujumbe wa kukaribisha / kuaga wanachama kwenye group
  WELCOME_MESSAGE: (name, groupName) =>
    `👑 Karibu @${name} kwenye *${groupName}*!\nSoma sheria za group na ujisikie huru. 🎉`,
  GOODBYE_MESSAGE: (name, groupName) =>
    `👋 @${name} ameondoka kwenye *${groupName}*. Kwaheri!`,

  // Mipangilio ya seva ya wavuti (pairing)
  WEB_PORT: process.env.PORT || 3000,
  SOFTWARE_CREDIT: "this software provided by DarkX",
};
