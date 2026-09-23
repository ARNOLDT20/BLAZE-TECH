const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { isOwner, getQuotedMessage } = require("../lib/helpers");

function unwrap(message) {
  return message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message?.ephemeralMessage?.message || message || {};
}

module.exports = {
  command: ["viewonce", "vv"],
  description: "Retrieve quoted view-once media",
  async run({ sock, msg, jid, args, reply, config }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const quoted = getQuotedMessage(msg);
    if (!quoted) return reply("Reply to a view-once image, video, audio, or document with .viewonce");
    const content = unwrap(quoted.message);
    const type = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"].find(key => content[key]);
    if (!type) return reply("The quoted message is not supported view-once media.");
    try {
      const buffer = await downloadMediaMessage(quoted, "buffer", {});
      const media = content[type];
      const key = type.replace("Message", "");
      await sock.sendMessage(jid, {
        [key]: buffer,
        mimetype: media.mimetype,
        caption: media.caption ? `♻️ ${media.caption}` : "♻️ Retrieved view-once media",
        fileName: media.fileName,
        ptt: type === "audioMessage" ? Boolean(media.ptt) : undefined
      }, { quoted: msg });
    } catch (error) {
      await reply(`Could not retrieve the media: ${error.message}`);
    }
  }
};
