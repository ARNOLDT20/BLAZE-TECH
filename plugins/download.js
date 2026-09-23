const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const { getQuotedMessage, isOwner } = require("../lib/helpers");
const { downloadSocial, cleanupDownload } = require("../lib/social-downloader");

function unwrap(message) {
  return message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message?.ephemeralMessage?.message || message || {};
}

module.exports = {
  command: ["download", "save"],
  description: "Download quoted media or a social-media URL",
  async run({ sock, msg, jid, args, reply, config }) {
    const url = args.find(value => /^https?:\/\//i.test(value));
    if (url) {
      let result;
      try {
        await reply("⏳ Fetching the social-media media link. This can take up to 3 minutes...");
        result = await downloadSocial(url, null, {
          audio: args.includes("audio") || args.includes("mp3"),
          quality: args.find(value => /^\d{3,4}$/.test(value)) || 720
        });
        const caption = `📥 ${result.title}\n⚡ Downloaded free with yt-dlp\n✅ Please respect the creator's rights.`;
        const audio = args.includes("audio") || args.includes("mp3");
        const media = fs.readFileSync(result.filePath);
        await sock.sendMessage(jid, audio
          ? { audio: media, mimetype: "audio/mpeg", fileName: `${result.title.slice(0, 60)}.mp3`, caption }
          : { video: media, mimetype: "video/mp4", caption }, jid.endsWith("@newsletter") ? {} : { quoted: msg });
      } catch (error) {
        await reply(`❌ Social download failed: ${error.message}`);
      } finally {
        cleanupDownload(result);
      }
      return;
    }

    const quoted = getQuotedMessage(msg);
    if (!quoted) return reply("Reply to media with .download, or use .download <social-media-url>");
    const content = unwrap(quoted.message);
    const type = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"].find(key => content[key]);
    if (!type) return reply("This media type cannot be downloaded by the bot.");
    const isViewOnce = Boolean(quoted.message?.viewOnceMessage || quoted.message?.viewOnceMessageV2 || content?.viewOnce);
    if (isViewOnce && !isOwner(sock, config, msg)) return reply("⛔ Only the owner can retrieve view-once media.");
    try {
      const buffer = await downloadMediaMessage(quoted, "buffer", {});
      const media = content[type];
      const key = type.replace("Message", "");
      await sock.sendMessage(jid, {
        [key]: buffer,
        mimetype: media.mimetype,
        caption: media.caption ? `📥 ${media.caption}` : "📥 Downloaded media",
        fileName: media.fileName,
        ptt: type === "audioMessage" ? Boolean(media.ptt) : undefined
      }, jid.endsWith("@newsletter") ? {} : { quoted: msg });
    } catch (error) {
      await reply(`Download failed: ${error.message}`);
    }
  }
};
