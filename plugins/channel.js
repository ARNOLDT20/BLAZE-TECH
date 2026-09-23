const store = require("../lib/store");
const { isOwner, getQuotedMessage } = require("../lib/helpers");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { beautifyText, decorateCaption, watermarkMedia } = require("../lib/beautify");

module.exports = {
  command: ["channel", "chan"],
  description: "Configure and post to a WhatsApp channel",
  async run({ sock, msg, jid, args, reply, config }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const state = store.load();
    const action = (args.shift() || "status").toLowerCase();

    if (action === "jid" || action === "here") {
      if (jid.endsWith("@newsletter")) return reply(`📣 This newsletter JID is:\n${jid}`);
      return reply("Open the target newsletter and send .channel jid there. The bot will return its exact JID.");
    }
    if (action === "set") {
      const target = args[0] === "here" ? jid : (args[0] || "");
      if (!/^\d+@newsletter$/.test(target)) return reply("Usage: .channel set <channelJid>\nOr run .channel set here inside the target newsletter.");
      state.channel.jid = target;
      store.save(state);
      return reply(`📣 Channel saved: ${target}`);
    }
    if (action === "post") {
      if (!state.channel.jid) return reply("Set a channel first with .channel set <channelJid>");
      const text = args.join(" ").trim();
      if (!text) return reply("Usage: .channel post <message>");
      await sock.sendMessage(state.channel.jid, { text: beautifyText(text, config) });
      return reply("✅ Posted to the configured channel.");
    }
    if (action === "media" || action === "postmedia") {
      if (!state.channel.jid) return reply("Set a channel first with .channel set <channelJid>");
      const quoted = getQuotedMessage(msg);
      const content = quoted?.message?.viewOnceMessage?.message || quoted?.message?.viewOnceMessageV2?.message || quoted?.message || {};
      const type = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"].find(key => content[key]);
      if (!quoted || !type) return reply("Reply to an image, video, audio, or document with .channel media <caption>");
      const media = content[type];
      const buffer = await watermarkMedia(await downloadMediaMessage(quoted, "buffer", {}), media.mimetype || "", config);
      const key = type.replace("Message", "");
      await sock.sendMessage(state.channel.jid, {
        [key]: buffer,
        mimetype: media.mimetype,
        caption: decorateCaption(args.join(" ") || media.caption || "", config),
        fileName: media.fileName,
        ptt: type === "audioMessage" ? Boolean(media.ptt) : undefined
      });
      return reply("✅ Watermarked media posted to the configured channel.");
    }
    if (action === "auto") {
      const mode = (args.shift() || "status").toLowerCase();
      if (mode === "off") {
        state.channel.autoPost.enabled = false;
        store.save(state);
        return reply("⏸️ Channel auto-posting disabled.");
      }
      if (mode === "on") {
        const intervalMinutes = Math.max(1, Math.min(1440, Number(args.shift() || 60)));
        const text = args.join(" ").trim();
        if (!state.channel.jid || !text) return reply("Usage: .channel auto on <minutes> <message>");
        state.channel.autoPost = { enabled: true, intervalMinutes, text };
        store.save(state);
        return reply(`▶️ Auto-posting enabled every ${intervalMinutes} minute(s).`);
      }
      return reply(`Auto-posting: ${state.channel.autoPost.enabled ? "on" : "off"}`);
    }
    if (action === "status") {
      return reply(`📣 Channel: ${state.channel.jid || "not configured"}\nAuto-post: ${state.channel.autoPost.enabled ? `on every ${state.channel.autoPost.intervalMinutes}m` : "off"}`);
    }
    return reply(".channel set <jid>\n.channel post <text>\n.channel auto on <minutes> <text>\n.channel auto off\n.channel status");
  }
};
