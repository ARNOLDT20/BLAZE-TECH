const fs = require("fs");
const path = require("path");
const store = require("../lib/store");

const sections = {
  core: `╭─〔 ✨ CORE 〕
│ .ping
│ .alive
│ .menu
│ .help
│ .aura status
╰──────────────`,
  channels: `╭─〔 📣 CHANNELS · OWNER 〕
│ .channel jid
│ .channel set here
│ .channel set <jid>
│ .channel post <text>
│ .channel auto on <min> <text>
│ .channel auto off
│ .channel media <caption> (reply)
│ .schedule add <min> <text>
│ .schedule list
│ .schedule pause/resume <id>
│ .schedule remove <id>
│ .schedule on/off
╰──────────────`,
  groups: `╭─〔 🛡️ GROUPS · ADMIN 〕
│ .antilink on/off
│ .warn @user [reason]
│ .badwords on/off/add/remove
│ .promote .demote .kick .add
│ .mute .unmute .open .close
│ .tagall .groupinfo .invite
│ .setsubject .setdesc
╰──────────────`,
  status: `╭─〔 🌟 STATUS · OWNER 〕
│ .statusreact on/off
│ .statusreact emojis <set>
│ .statusreact add/remove <emoji>
│ .addstatus self text <text>
│ .addstatus <groupJid> text <text>
│ Reply to media: .addstatus self
╰──────────────`,
  tools: `╭─〔 ⚙️ TOOLS · OWNER 〕
│ .prefix set <prefix>
│ .viewonce / .vv (reply)
│ .download / .dl (reply)
│ .download <social URL> [audio] [quality]
│ .menuimage set/reset (reply)
│ .menustyle aura/minimal/royal/neon
│ .setname <name>
│ .brand watermark <text>
│ .brand notice <text>
╰──────────────`
};

const compactAll = `╭─〔 ✨ CORE 〕
│ .ping
│ .alive
│ .menu
│ .help
│ .aura status
╰──────────────

╭─〔 📣 CHANNELS · OWNER 〕
│ .channel jid (inside a newsletter)
│ .channel set here
│ .channel set <jid>
│ .channel post <text>
│ .channel auto on <min> <text>
│ .channel auto off
│ .channel status
│ Reply media: .channel media <caption>
│ .schedule add <min> <text>
│ .schedule list
│ .schedule remove <id>
│ .schedule on / off
╰──────────────

╭─〔 🛡️ GROUPS · ADMIN 〕
│ .antilink on / off
│ .promote @user
│ .demote @user
│ .kick @user
│ .add <number>
│ .mute / .unmute
│ .open / .close
│ .tagall
│ .groupinfo
│ .invite
│ .setsubject <name>
│ .setdesc <text>
╰──────────────

╭─〔 🌟 STATUS · OWNER 〕
│ .statusreact on / off
│ .statusreact emojis <set>
│ .statusreact add <emoji>
│ .statusreact remove <emoji>
│ .addstatus self text <text>
│ .addstatus <groupJid> text <text>
│ Reply media: .addstatus self
╰──────────────

╭─〔 ⚙️ TOOLS · OWNER 〕
│ .prefix set <prefix>
│ .viewonce / .vv (reply)
│ .download / .dl (reply)
│ .download <social URL> [audio] [quality]
│ .menuimage set (reply)
│ .menuimage reset
│ .menustyle aura
│ .menustyle minimal
│ .menustyle royal
│ .menustyle <style>
│ .setname <name>
│ .brand watermark <text>
│ .brand notice <text>
│
│ Short aliases: .p .a .m .ch .sch .al
│ .w .bw .pro .de .k .ta .sr .as .self .gs .gc
│ .vv .px .mi .ms .br
╰──────────────`;

module.exports = {
  command: "menu",
  description: "Show the categorized Aura-XMD menu",
  async run({ sock, jid, msg, reply, config, args }) {
    const state = store.load();
    const requested = String(args[0] || "all").toLowerCase();
    const selected = requested === "all" ? [] : [requested].filter(key => sections[key]);
    if (requested !== "all" && !selected.length) return reply("Choose: core, channels, groups, status, tools, or all.");
    const user = String(sock.user?.id || "unknown").split(":")[0].split("@")[0];
    const intro = `╭━━〔 ${config.botName} · ${state.menuStyle} 〕━━╮\n│ Owner: ${config.ownerName}\n│ User: ${user}\n│ Total cmd: ${config.totalCommands || 0}\n│ Prefix: ${config.prefix}\n│ Platform: WhatsApp\n│ Category: ${requested}\n│ *Made with love by ARNOLDT20*\n╰━━━━━━━━━━━━━━━━━━━━╯`;

    const caption = requested === "all"
      ? `${intro}\n\n${compactAll}`
      : `${intro}\n\n${sections[selected[0]]}`;
    const imagePath = path.join(__dirname, "..", state.menuImagePath || "assets/aura-menu.jpg");
    if (fs.existsSync(imagePath)) {
      // One media message: WhatsApp renders the menu caption beneath the image.
      await sock.sendMessage(jid, { image: fs.readFileSync(imagePath), caption: caption.slice(0, 4000) }, jid.endsWith("@newsletter") ? {} : { quoted: msg });
      return;
    }
    await reply(caption);
  }
};
