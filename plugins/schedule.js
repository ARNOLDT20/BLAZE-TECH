const store = require("../lib/store");
const { isOwner } = require("../lib/helpers");

module.exports = {
  command: "schedule",
  description: "Manage recurring channel posts",
  async run({ sock, msg, args, reply, config }) {
    if (!isOwner(sock, config, msg)) return reply("⛔ Owner permission required.");
    const state = store.load();
    const action = (args.shift() || "list").toLowerCase();
    state.channel.schedules ||= [];

    if (action === "add") {
      if (!state.channel.jid) return reply("Set a channel first with .channel set <jid> or .channel set here.");
      const minutes = Math.max(1, Math.min(10080, Number(args.shift() || 0)));
      const text = args.join(" ").trim();
      if (!minutes || !text) return reply("Usage: .schedule add <minutes> <message>");
      const id = state.channel.schedules.length ? Math.max(...state.channel.schedules.map(item => item.id)) + 1 : 1;
      state.channel.schedules.push({ id, intervalMinutes: minutes, text, enabled: true, lastPostedAt: 0 });
      store.save(state);
      return reply(`✅ Schedule #${id} added: every ${minutes} minute(s).`);
    }
    if (action === "list") {
      if (!state.channel.schedules.length) return reply("No scheduled posts. Use .schedule add <minutes> <message>");
      const lines = state.channel.schedules.map(item => `#${item.id} · ${item.enabled ? "on" : "off"} · every ${item.intervalMinutes}m · ${item.text}`);
      return reply(`📅 Scheduled posts\n${lines.join("\n")}`);
    }
    if (action === "remove") {
      const id = Number(args[0]);
      const before = state.channel.schedules.length;
      state.channel.schedules = state.channel.schedules.filter(item => item.id !== id);
      store.save(state);
      return reply(before === state.channel.schedules.length ? "Schedule not found." : `✅ Schedule #${id} removed.`);
    }
    if (action === "on" || action === "off") {
      state.channel.schedulesEnabled = action === "on";
      store.save(state);
      return reply(`📅 Scheduled posts ${action === "on" ? "enabled" : "disabled"}.`);
    }
    if (action === "pause" || action === "resume") {
      const id = Number(args[0]);
      const item = state.channel.schedules.find(entry => entry.id === id);
      if (!item) return reply("Schedule not found.");
      item.enabled = action === "resume";
      store.save(state);
      return reply(`✅ Schedule #${id} ${item.enabled ? "resumed" : "paused"}.`);
    }
    return reply(".schedule add <minutes> <message>\n.schedule list\n.schedule remove <id>\n.schedule pause/resume <id>\n.schedule on/off");
  }
};
