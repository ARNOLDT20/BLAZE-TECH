const store = require("../lib/store");
const { isOwner } = require("../lib/helpers");

module.exports = {
  command: ["statusreact", "status"],
  description: "Configure automatic status reactions",
  async run({ sock, msg, args, reply, config }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const state = store.load();
    const action = (args.shift() || "status").toLowerCase();
    if (action === "on" || action === "off") {
      state.statusReactions.enabled = action === "on";
      store.save(state);
      return reply(`✨ Status reactions ${state.statusReactions.enabled ? "enabled" : "disabled"}.`);
    }
    if (action === "emojis") {
      const emojis = args.join("").trim();
      if (!emojis) return reply("Usage: .statusreact emojis ✨🔥💜🌟");
      state.statusReactions.emojis = [...emojis].slice(0, 20);
      store.save(state);
      return reply(`✨ Status emoji set updated: ${state.statusReactions.emojis.join(" ")}`);
    }
    if (action === "add") {
      const emoji = [...args.join("")][0];
      if (!emoji) return reply("Usage: .statusreact add <emoji>");
      if (!state.statusReactions.emojis.includes(emoji)) state.statusReactions.emojis.push(emoji);
      state.statusReactions.emojis = state.statusReactions.emojis.slice(0, 20);
      store.save(state);
      return reply(`✨ Added ${emoji}. Set: ${state.statusReactions.emojis.join(" ")}`);
    }
    if (action === "remove") {
      const emoji = [...args.join("")][0];
      state.statusReactions.emojis = state.statusReactions.emojis.filter(item => item !== emoji);
      store.save(state);
      return reply(`✨ Removed ${emoji || "emoji"}. Set: ${state.statusReactions.emojis.join(" ")}`);
    }
    return reply(`Status reactions: ${state.statusReactions.enabled ? "on" : "off"}\nEmojis: ${state.statusReactions.emojis.join(" ")}\nUse .statusreact on/off, emojis <set>, add <emoji>, or remove <emoji>`);
  }
};
