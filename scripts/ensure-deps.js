const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const required = [
  path.join(__dirname, "..", "node_modules", "@whiskeysockets", "baileys", "package.json"),
  path.join(__dirname, "..", "node_modules", "pino", "package.json")
];

if (required.every(file => fs.existsSync(file))) process.exit(0);

console.log("[Aura-XMD] Dependencies are missing; installing from package-lock.json...");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["ci", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit"
});

if (result.error) {
  console.error(`[Aura-XMD] Could not start npm: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`[Aura-XMD] npm ci failed with exit code ${result.status}.`);
  process.exit(result.status || 1);
}
