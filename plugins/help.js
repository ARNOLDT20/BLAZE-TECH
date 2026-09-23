const guide = `╭━━〔 BLAZE TECH · AURA-XMD HELP 〕━━╮
│ Use the current prefix before every command.
│ Example: .ping or !ping after changing prefix.
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 CORE 〕
│ .ping / .p
│ Check that the bot replies.
│ .alive / .a
│ Show bot name and online status.
│ .menu / .m [category]
│ Show all commands or core/channels/groups/status/tools.
│ .help / .h
│ Show this full usage guide.
│ .aura status / .ar status
│ Show Aura configuration.
│ .setname <name> / .sn <name>
│ Change the bot display name.
╰──────────────

╭─〔 CHANNELS 〕
│ .channel jid / .ch jid
│ Run inside a newsletter to show its exact JID.
│ .channel set here
│ Save the newsletter where this command is sent.
│ .channel set <jid>
│ Save a newsletter JID manually.
│ .channel post <text>
│ Beautify and post text to the saved channel.
│ .channel media <caption>
│ Reply to media and post a watermarked copy.
│ .channel auto on <minutes> <text>
│ Enable one repeating post.
│ .channel auto off
│ Disable the repeating post.
│ .channel status
│ Show saved channel and auto-post state.
│ .schedule add <minutes> <text>
│ Add a recurring post.
│ .schedule list
│ List schedule IDs and intervals.
│ .schedule pause/resume <id>
│ Pause or resume one schedule.
│ .schedule remove <id>
│ Delete one schedule.
│ .schedule on/off
│ Enable or disable all schedules.
╰──────────────

╭─〔 GROUPS 〕
│ .antilink on/off / .al on/off
│ Enable or disable link removal in this group.
│ .warn @user [reason] / .w @user
│ Tag a member with a polite rule warning; 3 warnings remove them.
│ .warn reset @user
│ Reset a member's warning count.
│ .badwords on/off / .bw on/off
│ Enable or disable prohibited-word protection.
│ .badwords add/remove <word>
│ Manage this group's prohibited-word list.
│ .badwords list
│ Show the current protection status and word count.
│ .promote @user / .pro @user
│ Promote a member.
│ .demote @user / .de @user
│ Demote a member.
│ .kick @user / .k @user
│ Remove a member.
│ .add <number> / .ad <number>
│ Add a member by full country-code number.
│ .mute/.unmute / .mu/.um
│ Make the group admin-only or open.
│ .open/.close / .op/.cl
│ Open or close group messaging.
│ .tagall [text] / .ta [text]
│ Mention every group member.
│ .groupinfo / .gi
│ Show group information.
│ .invite / .inv
│ Show the group invite link.
│ .setsubject <name> / .ss <name>
│ Change the group name.
│ .setdesc <text> / .sd <text>
│ Change the group description.
╰──────────────

╭─〔 STATUS 〕
│ .selfstatus <text> / .self <text>
│ Post beautified text to your personal status.
│ .groupstatus <text> / .gc or .gs
│ Use inside a group to target that group members.
│ Reply to media with .groupstatus or .gcstatus
│ Post watermarked group-targeted media status.
│ .addstatus self text <text> / .as
│ Legacy personal status command.
│ .statusreact on/off / .sr on/off
│ Enable or disable status reactions.
│ .statusreact emojis <set>
│ Replace the emoji set.
│ .statusreact add/remove <emoji>
│ Add or remove one reaction emoji.
╰──────────────

╭─〔 MEDIA & BRANDING 〕
│ .download / .dl (reply)
│ Retrieve quoted image, video, audio, document, or view-once media.
│ .download <social URL> [audio] [quality]
│ Download public TikTok, YouTube, Instagram, Facebook, X, and more.
│ .viewonce / .vv (reply)
│ Retrieve quoted view-once media.
│ .prefix set <prefix> / .px set <prefix>
│ Change the command prefix.
│ .menuimage set/reset / .mi
│ Save a replied image as the menu image or reset it.
│ .menustyle <style> / .ms <style>
│ Choose aura, minimal, royal, or neon.
│ .brand watermark <text> / .br watermark <text>
│ Set the persistent BLAZE TECH watermark.
│ .brand notice <text> / .br notice <text>
│ Set the reaction/share footer notice.
╰──────────────

Every owner post is beautified with the BLAZE TECH watermark and a reaction/share notice. Group actions require admin rights, and channel posting requires channel permission.`;

module.exports = {
  command: "help",
  description: "Show detailed command usage",
  async run({ sock, jid, msg, reply }) {
    for (let index = 0; index < guide.length; index += 3500) {
      await sock.sendMessage(jid, { text: guide.slice(index, index + 3500) }, jid.endsWith("@newsletter") ? {} : { quoted: index === 0 ? msg : undefined });
    }
  }
};
