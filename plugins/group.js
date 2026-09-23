const store = require("../lib/store");
const { getTargetJids, getGroupMetadata, requireGroupAdmin, requireBotAdmin } = require("../lib/helpers");
const { sendModerationWarning } = require("../lib/moderation");

module.exports = {
  command: ["antilink", "warn", "badwords", "promote", "demote", "kick", "add", "mute", "unmute", "groupinfo", "tagall", "open", "close", "setsubject", "setdesc", "invite"],
  description: "Group moderation and administration",
  async run({ sock, msg, jid, args, reply, config, command }) {
    if (!jid.endsWith("@g.us")) return reply("⛔ This command can only be used in a group.");
    const state = store.load();
    state.groups[jid] ||= { antilink: false, badwords: false, badwordList: [], warnings: {} };
    state.groups[jid].badwordList ||= [];
    state.groups[jid].warnings ||= {};
    const group = state.groups[jid];
    const action = command || "antilink";

    if (action === "antilink") {
      if (!(await requireGroupAdmin({ sock, jid, msg, config, reply }))) return;
      const mode = (args[0] || "status").toLowerCase();
      if (mode === "on" || mode === "off") {
        group.antilink = mode === "on";
        store.save(state);
        return reply(`🔗 Antilink ${mode === "on" ? "enabled" : "disabled"}. Violating links will be removed with a tagged polite warning.`);
      }
      return reply(`🔗 Antilink: ${group.antilink ? "on" : "off"}\nUse .antilink on/off`);
    }

    if (action === "badwords") {
      if (!(await requireGroupAdmin({ sock, jid, msg, config, reply }))) return;
      const mode = (args.shift() || "status").toLowerCase();
      if (mode === "on" || mode === "off") {
        group.badwords = mode === "on";
        store.save(state);
        return reply(`🛡️ Bad-word protection ${group.badwords ? "enabled" : "disabled"}.`);
      }
      if (mode === "add" || mode === "remove") {
        const word = args.join(" ").trim().toLowerCase();
        if (!word) return reply(`Use .badwords ${mode} <word>`);
        if (mode === "add" && !group.badwordList.includes(word)) group.badwordList.push(word);
        if (mode === "remove") group.badwordList = group.badwordList.filter(item => item !== word);
        store.save(state);
        return reply(`✅ Bad-word list updated. Words: ${group.badwordList.length}`);
      }
      return reply(`🛡️ Bad-word protection: ${group.badwords ? "on" : "off"}\nWords: ${group.badwordList.join(", ") || "none"}\nUse .badwords on/off/add/remove`);
    }

    if (action === "warn") {
      if (!(await requireGroupAdmin({ sock, jid, msg, config, reply }))) return;
      const reset = (args[0] || "").toLowerCase() === "reset";
      if (reset) args.shift();
      const targets = getTargetJids(msg, args);
      if (!targets.length) return reply("Reply to or mention a member. Usage: .warn @user [reason]");
      const target = targets[0];
      if (reset) {
        delete group.warnings[target];
        store.save(state);
        return reply(`✅ Warning count reset for @${target.split("@")[0]}.`, { mentions: [target] });
      }
      const count = (group.warnings[target] || 0) + 1;
      group.warnings[target] = count;
      store.save(state);
      const limit = 3;
      await sendModerationWarning(sock, jid, msg, {
        target,
        reason: args.join(" ") || "a group rule",
        detail: `Warning ${count}/${limit}. Kindly follow the group rules.`
      });
      if (count >= limit && await requireBotAdmin(sock, jid, () => {})) {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
        return reply(`🚪 @${target.split("@")[0]} reached the warning limit and was removed.`, { mentions: [target] });
      }
      return;
    }

    if (!(await requireGroupAdmin({ sock, jid, msg, config, reply }))) return;
    if (["promote", "demote", "kick", "add"].includes(action) && !(await requireBotAdmin(sock, jid, reply))) return;
    const targets = getTargetJids(msg, args);
    if (["promote", "demote", "kick", "add"].includes(action) && !targets.length) return reply(`Mention a member or provide a number. Usage: .${action} @member`);
    if (action === "promote") await sock.groupParticipantsUpdate(jid, targets, "promote");
    if (action === "demote") await sock.groupParticipantsUpdate(jid, targets, "demote");
    if (action === "kick") await sock.groupParticipantsUpdate(jid, targets, "remove");
    if (action === "add") await sock.groupParticipantsUpdate(jid, targets, "add");
    if (["promote", "demote", "kick", "add"].includes(action)) return reply(`✅ ${action} completed.`);

    if (action === "mute" || action === "unmute") {
      await sock.groupSettingUpdate(jid, action === "mute" ? "announcement" : "not_announcement");
      return reply(`✅ Group is now ${action === "mute" ? "muted" : "open"}.`);
    }
    if (action === "open" || action === "close") {
      await sock.groupSettingUpdate(jid, action === "close" ? "announcement" : "not_announcement");
      return reply(`✅ Group is now ${action === "close" ? "admin-only" : "open"}.`);
    }
    if (action === "setsubject") {
      const subject = args.join(" ").trim();
      if (!subject) return reply("Usage: .setsubject <new group name>");
      await sock.groupUpdateSubject(jid, subject);
      return reply("✅ Group name updated.");
    }
    if (action === "setdesc") {
      const description = args.join(" ").trim();
      await sock.groupUpdateDescription(jid, description);
      return reply("✅ Group description updated.");
    }
    if (action === "invite") {
      const code = await sock.groupInviteCode(jid);
      return reply(`🔗 Group invite: https://chat.whatsapp.com/${code}`);
    }
    if (action === "groupinfo") {
      const metadata = await getGroupMetadata(sock, jid);
      return reply(`👥 ${metadata.subject}\nMembers: ${metadata.participants.length}\nOwner: ${metadata.owner || "unknown"}`);
    }
    if (action === "tagall") {
      const metadata = await getGroupMetadata(sock, jid);
      const mentions = metadata.participants.map(item => item.id);
      return sock.sendMessage(jid, { text: args.join(" ") || "Attention everyone", mentions });
    }
    return reply("Group command unavailable.");
  }
};
