const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { isOwner, getQuotedMessage, getGroupMetadata } = require("../lib/helpers");
const { beautifyText, decorateCaption, watermarkMedia } = require("../lib/beautify");

function unwrap(message) {
  return message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message?.ephemeralMessage?.message || message || {};
}

async function targetList(sock, target) {
  if (!target || target === "self") return undefined;
  if (!target.endsWith("@g.us")) throw new Error("Target must be self or a group JID ending in @g.us.");
  const metadata = await getGroupMetadata(sock, target);
  return metadata.participants.map(item => item.id);
}

module.exports = {
  command: ["addstatus", "statuspost", "selfstatus", "mystatus", "groupstatus", "gcstatus"],
  description: "Post a text or quoted media status",
  async run({ sock, msg, jid, args, reply, config, command }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const fixedTarget = ["groupstatus", "gcstatus"].includes(command) ? jid : "self";
    if (fixedTarget === jid && !jid.endsWith("@g.us")) return reply("Use .groupstatus inside a group chat.");
    const target = fixedTarget === "self" ? "self" : fixedTarget;
    if (fixedTarget === "self" && !["selfstatus", "mystatus"].includes(command)) {
      // Legacy form: .addstatus self ... or .statuspost <groupJid> ...
      if (args[0] && (args[0] === "self" || args[0].endsWith("@g.us"))) args.shift();
    }
    const mode = (args[0] || "text").toLowerCase();
    if (mode === "text") args.shift();
    const statusJidList = await targetList(sock, target);
    const quoted = getQuotedMessage(msg);
    const quotedContent = quoted ? unwrap(quoted.message) : null;
    const mediaType = quotedContent && ["imageMessage", "videoMessage", "audioMessage", "documentMessage"].find(type => quotedContent[type]);

    if (mediaType) {
      const buffer = await watermarkMedia(await downloadMediaMessage(quoted, "buffer", {}), media.mimetype || "", config);
      const media = quotedContent[mediaType];
      const key = mediaType.replace("Message", "");
      await sock.sendMessage("status@broadcast", {
        [key]: buffer,
        mimetype: media.mimetype,
        caption: decorateCaption(args.join(" ") || media.caption || "", config),
        ptt: mediaType === "audioMessage" ? Boolean(media.ptt) : undefined
      }, { statusJidList });
      return reply(`✅ ${target === "self" ? "Personal" : "Group-targeted"} media status posted.`);
    }

    const text = args.join(" ").trim();
    if (!text) return reply("Usage: .addstatus self text <message>\nReply to media: .addstatus self");
    await sock.sendMessage("status@broadcast", { text: beautifyText(text, config) }, { statusJidList });
    return reply(`✅ ${target === "self" ? "Personal" : "Group-targeted"} status posted.`);
  }
};
