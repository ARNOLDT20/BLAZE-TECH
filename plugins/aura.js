const store = require("../lib/store");
const { isOwner } = require("../lib/helpers");

module.exports = {
  command: ["aura", "setname"],
  description: "Configure Aura-XMD branding",
  async run({ sock, msg, args, reply, config, command }) {
    const state = store.load();
    if (command === "setname") {
      if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
      const name = args.join(" ").trim();
      if (!name) return reply("Usage: .setname <new name>");
      state.botName = name.slice(0, 40);
      config.botName = state.botName;
      store.save(state);
      return reply(`✨ Bot name changed to ${state.botName}.`);
    }
    const action = (args.shift() || "status").toLowerCase();
    if (action === "status") {
      await reply(`✨ ${config.botName}\nChannel: ${state.channel.jid || "not configured"}\nStatus reactions: ${state.statusReactions.enabled ? "on" : "off"}`);
      return;
    }
    if (!isOwner(sock, config, msg)) {
      await reply("⛔ Owner permission required.");
      return;
    }
    if (action === "name") {
      const name = args.join(" ").trim();
      if (!name) return reply("Usage: .aura name <new name>");
      state.botName = name.slice(0, 40);
      config.botName = state.botName;
      store.save(state);
      await reply(`✨ Bot name changed to ${state.botName}.`);
      return;
    }
    await reply("Usage: .aura status\n.aura name <new name>");
  }
};
