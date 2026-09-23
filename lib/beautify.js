const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

function shellEscapeText(value) {
  return String(value || "Aura-XMD")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

function beautifyText(text, config) {
  const body = String(text || "").trim();
  const name = config.watermarkText || config.botName || "Aura-XMD";
  const notice = config.reactionNotice || "React ❤️ and share this update ✨";
  return `╭─〔 ${name} 〕\n│ ${body.replace(/\n/g, "\n│ ")}\n╰──────────────\n${notice}`;
}

function decorateCaption(caption, config) {
  const notice = config.reactionNotice || "React ❤️ and share this update ✨";
  const body = String(caption || "").trim();
  return body ? `${body}\n\n${notice}` : notice;
}

function extensionFor(mimetype) {
  if (/video\/mp4/i.test(mimetype)) return ".mp4";
  if (/video\//i.test(mimetype)) return ".mp4";
  if (/image\/png/i.test(mimetype)) return ".png";
  if (/image\/webp/i.test(mimetype)) return ".webp";
  if (/image\//i.test(mimetype)) return ".jpg";
  return ".bin";
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(stderr.slice(-500) || `ffmpeg exited with ${code}`)));
  });
}

async function watermarkMedia(buffer, mimetype, config) {
  const extension = extensionFor(mimetype);
  if (!extension.match(/\.(jpg|jpeg|png|webp|mp4)$/i)) return buffer;
  const token = crypto.randomBytes(8).toString("hex");
  const input = path.join(os.tmpdir(), `aura-in-${token}${extension}`);
  const output = path.join(os.tmpdir(), `aura-out-${token}${extension === ".mp4" ? ".mp4" : ".jpg"}`);
  fs.writeFileSync(input, buffer, { mode: 0o600 });
  const watermark = shellEscapeText(config.watermarkText || config.botName || "Aura-XMD");
  const draw = `drawtext=text='${watermark}':fontcolor=white@0.78:fontsize=24:box=1:boxcolor=black@0.38:boxborderw=8:x=w-tw-24:y=h-th-24`;
  try {
    if (extension === ".mp4") {
      await run("ffmpeg", ["-y", "-i", input, "-vf", draw, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-c:a", "aac", "-movflags", "+faststart", output]);
    } else {
      await run("ffmpeg", ["-y", "-i", input, "-vf", draw, "-q:v", "5", output]);
    }
    return fs.readFileSync(output);
  } catch (error) {
    console.warn(`Watermark fallback used: ${error.message}`);
    return buffer;
  } finally {
    fs.rmSync(input, { force: true });
    fs.rmSync(output, { force: true });
  }
}

module.exports = { beautifyText, decorateCaption, watermarkMedia };
