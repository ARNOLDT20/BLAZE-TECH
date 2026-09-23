const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const stateFile = path.join(dataDir, "state.json");
const defaults = {
  botName: "Aura-XMD",
  watermarkText: "BLAZE TECH",
  reactionNotice: "React ❤️ and share this update ✨",
  prefix: ".",
  menuImagePath: "assets/aura-menu.jpg",
  menuStyle: "aura",
  channel: { jid: "", autoPost: { enabled: false, intervalMinutes: 60, text: "" }, schedules: [], schedulesEnabled: true },
  statusReactions: { enabled: true, emojis: ["✨", "🔥", "💜", "🌟", "😊", "👏", "⚡"] },
  groups: {}
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === "object" && !Array.isArray(item) && base[key] && typeof base[key] === "object") {
      merge(base[key], item);
    } else {
      base[key] = item;
    }
  }
  return base;
}

function load() {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  let state = clone(defaults);
  try {
    state = merge(state, JSON.parse(fs.readFileSync(stateFile, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Could not read state.json; using defaults.");
  }
  save(state);
  return state;
}

function save(state) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const temp = `${stateFile}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, stateFile);
}

module.exports = { load, save, defaults: clone(defaults) };
