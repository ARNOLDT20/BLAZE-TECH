function getParticipantId(value) {
  return String(value || "").split(":")[0];
}

function getMentionedJids(msg) {
  const context = msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo || {};
  return [...(context.mentionedJid || [])];
}

function getTargetJids(msg, args = []) {
  const mentioned = getMentionedJids(msg);
  if (mentioned.length) return mentioned;
  const context = msg?.message?.extendedTextMessage?.contextInfo || {};
  if (context.participant) return [context.participant];
  return args.filter(arg => /^\+?\d{7,15}$/.test(arg.replace(/[^\d+]/g, "")))
    .map(arg => `${arg.replace(/\D/g, "")}@s.whatsapp.net`);
}

function getQuotedMessage(msg) {
  const context = msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo || {};
  if (!context.quotedMessage) return null;
  return {
    key: { remoteJid: msg.key.remoteJid, fromMe: false, id: context.stanzaId, participant: context.participant },
    message: context.quotedMessage
  };
}

async function getGroupMetadata(sock, jid) {
  if (!jid.endsWith("@g.us")) throw new Error("This command can only be used in a group.");
  return sock.groupMetadata(jid);
}

async function isGroupAdmin(sock, jid, userJid) {
  const metadata = await getGroupMetadata(sock, jid);
  const user = metadata.participants.find(item => item.id === userJid || item.lid === userJid);
  return Boolean(user?.admin);
}

function isOwner(sock, config, msg) {
  const sender = msg?.key?.fromMe
    ? sock.user?.id
    : (msg?.key?.participant || (msg?.key?.remoteJid?.endsWith("@newsletter") ? sock.user?.id : msg?.key?.remoteJid) || sock.user?.id || "");
  const number = getParticipantId(sender).replace(/\D/g, "");
  return Boolean(config.ownerNumber && number.endsWith(config.ownerNumber)) ||
    getParticipantId(sender) === getParticipantId(sock.user?.id);
}

async function requireGroupAdmin({ sock, jid, msg, config, reply }) {
  if (isOwner(sock, config, msg)) return true;
  const sender = msg.key.participant || msg.key.remoteJid;
  if (!(await isGroupAdmin(sock, jid, sender))) {
    await reply("⛔ Group-admin permission required.");
    return false;
  }
  return true;
}

async function requireBotAdmin(sock, jid, reply) {
  const metadata = await getGroupMetadata(sock, jid);
  const botId = getParticipantId(sock.user?.id);
  const bot = metadata.participants.find(item => getParticipantId(item.id) === botId || getParticipantId(item.lid) === botId);
  if (!bot?.admin) {
    await reply("⛔ Make Aura an admin first.");
    return false;
  }
  return true;
}

function containsLink(text) {
  return /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|t\.me\/|discord\.gg\/)[^\s]+/i.test(text);
}

module.exports = {
  getParticipantId,
  getMentionedJids,
  getTargetJids,
  getQuotedMessage,
  getGroupMetadata,
  isGroupAdmin,
  isOwner,
  requireGroupAdmin,
  requireBotAdmin,
  containsLink
};
