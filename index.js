const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const store = require("./lib/store");
const { containsLink, isGroupAdmin, getParticipantId } = require("./lib/helpers");
const { beautifyText } = require("./lib/beautify");
const { sendModerationWarning } = require("./lib/moderation");

const plugins = new Map();
const aliases = new Map();
const pluginsDir = path.join(__dirname, "plugins");
const state = store.load();
config.botName = state.botName || config.botName;
config.prefix = state.prefix || config.prefix;
config.watermarkText = state.watermarkText || config.watermarkText;
config.reactionNotice = state.reactionNotice || config.reactionNotice;
let reconnectTimer;
let starting = false;
let socket;
let autoPosterTimer;

function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
  plugins.clear();
  aliases.clear();
  const commandNames = new Set();

  const shortAliases = {
    ping: "p", alive: "a", menu: "m", help: "h", aura: "ar", setname: "sn",
    channel: "ch", chan: "c", schedule: "sch", antilink: "al", warn: "w", badwords: "bw",
    promote: "pro", demote: "de", kick: "k", add: "ad", mute: "mu",
    unmute: "um", groupinfo: "gi", tagall: "ta", open: "op", close: "cl",
    setsubject: "ss", setdesc: "sd", invite: "inv", statusreact: "sr",
    status: "st", addstatus: "as", statuspost: "sp", selfstatus: "self",
    mystatus: "me", groupstatus: "gs", gcstatus: "gc", viewonce: "vv", download: "dl", save: "sv",
    prefix: "px", menuimage: "mi", menustyle: "ms", brand: "br"
  };

  for (const file of fs.readdirSync(pluginsDir).filter(file => file.endsWith(".js"))) {
    try {
      const fullPath = path.join(pluginsDir, file);
      delete require.cache[require.resolve(fullPath)];
      const plugin = require(fullPath);
      if (!plugin.command || typeof plugin.run !== "function") {
        console.warn(`Skipping ${file}: plugin must export command and run().`);
        continue;
      }
      const names = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      for (const name of names) {
        const normalized = String(name).trim().toLowerCase();
        commandNames.add(normalized);
        plugins.set(normalized, plugin);
        if (shortAliases[normalized]) {
          aliases.set(shortAliases[normalized], normalized);
          plugins.set(shortAliases[normalized], plugin);
        }
      }
      console.log(`Loaded plugin: ${file}`);
    } catch (error) {
      console.error(`Could not load plugin ${file}:`, error.stack || error.message);
    }
  }
  config.totalCommands = commandNames.size;
  console.log(`Loaded ${commandNames.size} commands and ${plugins.size - commandNames.size} aliases.`);
}

function getDisconnectCode(lastDisconnect) {
  return lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode;
}

function importBlazeSessionCode() {
  if (!config.blazeSessionId) return false;

  const credsPath = path.join(config.sessionFolder, "creds.json");
  if (fs.existsSync(credsPath) && !process.env.FORCE_SESSION_IMPORT) {
    console.log("Existing session credentials found; skipping BLAZE_SESSION_ID import.");
    return false;
  }

  const encoded = config.blazeSessionId.replace(/^BLAZE~/i, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("BLAZE_SESSION_ID is not valid Base64 (with optional BLAZE~ prefix).");
  }

  let creds;
  try {
    creds = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new Error("BLAZE_SESSION_ID does not decode to valid JSON credentials.");
  }

  if (!creds || typeof creds !== "object" || creds.registered !== true || !creds.me?.id) {
    throw new Error("Decoded BLAZE session is missing registered account credentials.");
  }

  fs.mkdirSync(config.sessionFolder, { recursive: true, mode: 0o700 });
  const tempPath = `${credsPath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, credsPath);
  console.log(`Imported BLAZE session credentials for ${creds.me.id}.`);
  return true;
}

function unwrapMessage(message) {
  let current = message;
  while (current?.ephemeralMessage?.message || current?.viewOnceMessage?.message || current?.documentWithCaptionMessage?.message) {
    current = current.ephemeralMessage?.message || current.viewOnceMessage?.message || current.documentWithCaptionMessage?.message;
  }
  return current || {};
}

function extractText(message) {
  const unwrapped = unwrapMessage(message);
  if (!unwrapped) return "";
  return (
    unwrapped.conversation ||
    unwrapped.extendedTextMessage?.text ||
    unwrapped.imageMessage?.caption ||
    unwrapped.videoMessage?.caption ||
    unwrapped.documentMessage?.caption ||
    ""
  ).trim();
}

async function sendConnectionMessage(sock) {
  if (!config.sendConnectionMessage || !sock.user?.id) return;
  const jid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  try {
    const current = store.load();
    const imagePath = path.join(__dirname, current.menuImagePath || "assets/aura-menu.jpg");
    const caption = `╭───〔 ${config.botName} 〕───╮\n│ ✅ Connection successful\n│ ⚡ Aura systems are online\n│\n│ Send ${config.prefix}menu for commands\n╰────────────────────╯`;
    await sock.sendMessage(jid, { text: caption });
    if (fs.existsSync(imagePath)) {
      try {
        await sock.sendMessage(jid, { image: fs.readFileSync(imagePath), caption });
      } catch (imageError) {
        console.error("Aura connection image could not be sent:", imageError.message);
      }
    }
    console.log(`Connection message sent to ${jid}.`);
  } catch (error) {
    console.error("Could not send connection message:", error.stack || error.message);
  }
}

function reactionForStatus(msg, emojis) {
  const id = String(msg.key?.id || msg.key?.participant || "status");
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return emojis[hash % emojis.length] || "✨";
}

async function reactToStatus(sock, msg) {
  const current = store.load();
  if (!current.statusReactions.enabled || !current.statusReactions.emojis.length) return;
  try {
    const emoji = reactionForStatus(msg, current.statusReactions.emojis);
    await sock.sendMessage("status@broadcast", { react: { text: emoji, key: msg.key } });
    console.log(`Reacted to status with ${emoji}.`);
  } catch (error) {
    console.error("Status reaction failed:", error.message);
  }
}

function startAutoPoster(sock) {
  clearInterval(autoPosterTimer);
  autoPosterTimer = setInterval(async () => {
    const current = store.load();
    const auto = current.channel.autoPost;
    if (!current.channel.jid) return;
    try {
      if (auto.enabled && auto.text && Date.now() - Number(auto.lastPostedAt || 0) >= Math.max(1, Number(auto.intervalMinutes || 60)) * 60000) {
        await sock.sendMessage(current.channel.jid, { text: beautifyText(auto.text, config) });
        auto.lastPostedAt = Date.now();
      }
      if (current.channel.schedulesEnabled !== false) {
        for (const schedule of current.channel.schedules || []) {
          if (!schedule.enabled || !schedule.text) continue;
          if (Date.now() - Number(schedule.lastPostedAt || 0) < Math.max(1, Number(schedule.intervalMinutes || 60)) * 60000) continue;
          await sock.sendMessage(current.channel.jid, { text: beautifyText(schedule.text, config) });
          schedule.lastPostedAt = Date.now();
          console.log(`Ran channel schedule #${schedule.id}.`);
        }
      }
      store.save(current);
    } catch (error) {
      console.error("Channel auto-post failed:", error.message);
    }
  }, 30000);
}

async function enforceAntilink(sock, msg, jid, text) {
  const current = store.load();
  const group = current.groups[jid];
  if (!jid.endsWith("@g.us") || !group) return false;
  const sender = msg.key.participant || msg.key.remoteJid;
  try {
    if (await isGroupAdmin(sock, jid, sender) || getParticipantId(sender) === getParticipantId(sock.user?.id)) return false;
    const linkViolation = group.antilink && containsLink(text);
    const matchedWord = group.badwords && (group.badwordList || []).find(word => word && new RegExp(`(^|\\s)${String(word).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}(?=\\s|$)`, "i").test(text));
    if (!linkViolation && !matchedWord) return false;
    await sock.sendMessage(jid, { delete: msg.key });
    await sendModerationWarning(sock, jid, msg, {
      reason: linkViolation ? "sharing links" : "using prohibited language",
      action: "remove",
      detail: linkViolation ? "Links are disabled here. Kindly ask an admin before sharing one." : "That language is not allowed here. Kindly keep the group respectful."
    });
    return true;
  } catch (error) {
    console.error("Antilink enforcement failed:", error.message);
    return false;
  }
}

async function requestPairingCode(sock, state, attempt = 1) {
  if (state.creds.registered) return;
  if (!config.phoneNumber) {
    console.error("No PHONE_NUMBER configured. Set it to digits only with country code, then restart.");
    return;
  }

  try {
    const code = await sock.requestPairingCode(config.phoneNumber);
    console.log(`Pairing code: ${code}`);
    console.log("On WhatsApp: Linked devices -> Link a device -> Link with phone number instead, then enter this code.");
  } catch (error) {
    console.error("Could not generate pairing code:", error.stack || error.message);
    if (socket === sock && !state.creds.registered && attempt < 5) {
      setTimeout(() => requestPairingCode(sock, state, attempt + 1), 3000);
    }
  }
}

async function startBot() {
  if (starting || (socket && socket.user)) return;
  starting = true;
  clearTimeout(reconnectTimer);

  try {
    fs.mkdirSync(config.sessionFolder, { recursive: true });
    importBlazeSessionCode();
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionFolder);
    let version;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      console.warn("Could not fetch the latest WhatsApp Web version; using Baileys defaults.");
    }

    socket = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      logger: pino({ level: process.env.LOG_LEVEL || "silent" }),
      printQRInTerminal: false,
      browser: ["BLAZE-MD", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false
    });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async update => {
      const { connection, lastDisconnect } = update;

      if (connection === "connecting") console.log("Connecting to WhatsApp...");
      if (connection === "open") {
        starting = false;
        console.log(`Connected: ${config.botName}`);
        await sendConnectionMessage(socket);
        startAutoPoster(socket);
      }
      if (connection === "close") {
        starting = false;
        socket = undefined;
        const code = getDisconnectCode(lastDisconnect);

        if (code === DisconnectReason.loggedOut) {
          console.error("Logged out. Delete the session folder and pair again.");
          return;
        }
        if (code === DisconnectReason.connectionReplaced) {
          console.error("Connection replaced by another linked device; not retrying automatically.");
          return;
        }

        console.log(`Connection closed (code ${code ?? "unknown"}); retrying in ${config.reconnectDelayMs}ms.`);
        reconnectTimer = setTimeout(() => startBot().catch(console.error), config.reconnectDelayMs);
      }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          const jid = msg.key.remoteJid;
          if (!jid) continue;
          if (jid === "status@broadcast") {
            await reactToStatus(socket, msg);
            continue;
          }
          if (msg.key.fromMe && !config.allowFromMe && !jid.endsWith("@newsletter")) continue;

          const text = extractText(msg.message);
          if (process.env.DEBUG_MESSAGES === "1") {
            console.log(`[message] jid=${jid} keys=${Object.keys(msg.message).join(",")} textLength=${text.length}`);
          }
          if (await enforceAntilink(socket, msg, jid, text)) continue;
          if (!text.startsWith(config.prefix)) continue;
          const body = text.slice(config.prefix.length).trim();
          if (!body) continue;

          const [rawCommand, ...args] = body.split(/\s+/);
          const normalizedCommand = rawCommand.toLowerCase();
          const command = aliases.get(normalizedCommand) || normalizedCommand;
          const plugin = plugins.get(normalizedCommand);
          if (!plugin) continue;
          if (process.env.DEBUG_MESSAGES === "1") {
            console.log(`[command] ${normalizedCommand} -> ${command} args=${args.length}`);
          }

          await plugin.run({
            sock: socket,
            msg,
            jid,
            args,
            text,
            command,
            config,
            reply: value => socket.sendMessage(
              jid,
              { text: String(value) },
              jid.endsWith("@newsletter") ? {} : { quoted: msg }
            )
          });
        } catch (error) {
          console.error("Command error:", error.stack || error.message);
        }
      }
    });

    // Pairing is requested only for a fresh auth state; existing sessions reconnect normally.
    // Give the WebSocket time to complete its initial handshake before requesting a code.
    if (!state.creds.registered) setTimeout(() => requestPairingCode(socket, state), 5000);
  } catch (error) {
    starting = false;
    socket = undefined;
    console.error("Bot startup failed:", error.stack || error.message);
    reconnectTimer = setTimeout(() => startBot().catch(console.error), config.reconnectDelayMs);
  }
}

process.on("unhandledRejection", error => console.error("Unhandled rejection:", error));
process.on("uncaughtException", error => console.error("Uncaught exception:", error));

loadPlugins();
startBot().catch(console.error);
