const fs = require("fs");
const path = require("path");
const { getParticipantId } = require("./helpers");

const memeCandidates = [
  path.join(__dirname, "..", "assets", "moderation-chase.webp"),
  path.join(__dirname, "..", "assets", "moderation-chase.png")
];

function displayTag(jid) {
  const number = getParticipantId(jid).replace(/\D/g, "");
  return `@${number || "user"}`;
}

async function sendModerationWarning(sock, jid, msg, { reason = "that content", action = "remove", detail = "Please avoid it next time.", target: targetJid } = {}) {
  const target = targetJid || msg?.key?.participant || msg?.key?.remoteJid;
  const tag = displayTag(target);
  const text = `⚠️ ${tag}, please be respectful.\n\nThe content/action involving ${reason} is prohibited in this group. ${detail}\n\n🏃‍♂️💨 The BLAZE TECH moderation team is chasing that violation away!`;
  await sock.sendMessage(jid, { text, mentions: target ? [target] : [] }, { quoted: msg });
  const asset = memeCandidates.find(file => fs.existsSync(file));
  if (!asset) return;
  try {
    if (asset.endsWith(".webp")) await sock.sendMessage(jid, { sticker: fs.readFileSync(asset) }, { quoted: msg });
    else await sock.sendMessage(jid, { image: fs.readFileSync(asset), caption: "😂 Violation chased away — please follow the group rules." }, { quoted: msg });
  } catch (error) {
    console.warn("Moderation meme could not be sent:", error.message);
  }
}

module.exports = { sendModerationWarning, displayTag };
