const path = require("path");

const cleanPhoneNumber = value => String(value || "").replace(/\D/g, "");

module.exports = {
  botName: process.env.BOT_NAME || "Aura-XMD",
  watermarkText: process.env.WATERMARK_TEXT || "BLAZE TECH",
  reactionNotice: process.env.REACTION_NOTICE || "React ❤️ and share this update ✨",
  apifyToken: process.env.APIFY_TOKEN || "",
  ownerName: process.env.OWNER_NAME || "ARNOLDT20",
  ownerNumber: cleanPhoneNumber(process.env.OWNER_NUMBER || ""),
  // Required only for first-time pairing. Include country code, without '+'.
  phoneNumber: cleanPhoneNumber(process.env.PHONE_NUMBER || ""),
  blazeSessionId: String(process.env.BLAZE_SESSION_ID || "").trim(),
  prefix: process.env.PREFIX || ".",
  allowFromMe: process.env.ALLOW_SELF_MESSAGES !== "false",
  sendConnectionMessage: process.env.SEND_CONNECTION_MESSAGE !== "false",
  sessionFolder: path.resolve(__dirname, process.env.SESSION_FOLDER || "session"),
  reconnectDelayMs: Number(process.env.RECONNECT_DELAY_MS || 5000)
};
