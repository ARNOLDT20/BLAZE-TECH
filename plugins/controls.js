const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const store = require("../lib/store");
const { isOwner, getQuotedMessage } = require("../lib/helpers");

const assetsDir = path.join(__dirname, "..", "assets");
const customMenuPath = path.join(assetsDir, "user-menu.jpg");

async function saveQuotedImage(msg, reply) {
  const quoted = getQuotedMessage(msg);
  const media = quoted?.message?.imageMessage || quoted?.message?.viewOnceMessage?.message?.imageMessage || quoted?.message?.viewOnceMessageV2?.message?.imageMessage;
  if (!quoted || !media) {
    await reply("Reply to an image with the command to set it as the menu image.");
    return false;
  }
  const buffer = await downloadMediaMessage(quoted, "buffer", {});
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(customMenuPath, buffer, { mode: 0o600 });
  return true;
}

module.exports = {
  command: ["prefix", "menuimage", "menustyle", "brand"],
  description: "Configure prefix, menu image, and menu style",
  async run({ sock, msg, args, reply, config, command }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const state = store.load();

    if (command === "brand") {
      const action = (args.shift() || "status").toLowerCase();
      if (action === "watermark") {
        const value = args.join(" ").trim();
        if (!value) return reply(`Watermark: ${state.watermarkText}`);
        state.watermarkText = value.slice(0, 60);
        config.watermarkText = state.watermarkText;
        store.save(state);
        return reply(`✅ Watermark set to: ${state.watermarkText}`);
      }
      if (action === "notice") {
        const value = args.join(" ").trim();
        if (!value) return reply(`Notice: ${state.reactionNotice}`);
        state.reactionNotice = value.slice(0, 160);
        config.reactionNotice = state.reactionNotice;
        store.save(state);
        return reply("✅ Reaction/share notice updated.");
      }
      return reply(`Watermark: ${state.watermarkText}\nNotice: ${state.reactionNotice}\nUse .brand watermark <text> or .brand notice <text>`);
    }

    if (command === "prefix") {
      if ((args[0] || "").toLowerCase() !== "set") return reply(`Current prefix: ${config.prefix}\nUsage: ${config.prefix}prefix set <new prefix>`);
      const prefix = String(args[1] || "").trim();
      if (!prefix || prefix.length > 3 || /\s/.test(prefix)) return reply("Prefix must be 1–3 non-space characters.");
      state.prefix = prefix;
      config.prefix = prefix;
      store.save(state);
      return reply(`✅ Prefix changed to: ${prefix}`);
    }

    if (command === "menuimage") {
      const action = (args[0] || "set").toLowerCase();
      if (action === "reset") {
        state.menuImagePath = "assets/aura-menu.jpg";
        fs.rmSync(customMenuPath, { force: true });
        store.save(state);
        return reply("✅ Menu image reset to the Aura default.");
      }
      if (await saveQuotedImage(msg, reply)) {
        state.menuImagePath = "assets/user-menu.jpg";
        store.save(state);
        return reply("✅ Custom menu image saved. Use .menu to preview it.");
      }
      return undefined;
    }

    const style = String(args[0] || "").toLowerCase();
    const allowed = ["aura", "minimal", "royal", "neon"];
    if (!allowed.includes(style)) return reply(`Menu style: ${state.menuStyle}\nAvailable: ${allowed.join(", ")}`);
    state.menuStyle = style;
    store.save(state);
    return reply(`✅ Menu style set to ${style}.`);
  }
};
