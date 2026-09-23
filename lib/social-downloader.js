const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const bundledBinary = path.join(__dirname, "..", "bin", "yt-dlp");
const YTDLP = fs.existsSync(bundledBinary) ? bundledBinary : "yt-dlp";

function getPlatform(url) {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  if (host.includes("youtube") || host === "youtu.be") return "YouTube";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("facebook")) return "Facebook";
  if (host.includes("twitter") || host === "x.com") return "X";
  return "social media";
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr.slice(-1200) || `yt-dlp exited with ${code}`)));
  });
}

async function downloadSocial(url, _unusedToken, { audio = false, quality = 720 } = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Only public http(s) social-media URLs are supported.");
  const platform = getPlatform(url);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "aura-download-"));
  const output = path.join(workDir, "%(title).80B [%(id)s].%(ext)s");
  const args = ["--no-playlist", "--no-warnings", "--no-part", "--js-runtimes", "node", "--restrict-filenames", "--max-filesize", "80M", "-o", output];
  if (audio) {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    args.push("-f", `bv*[height<=${Number(quality) || 720}]+ba/b[height<=${Number(quality) || 720}]/b`, "--merge-output-format", "mp4");
  }
  args.push(url);
  try {
    const result = await runYtDlp(args);
    const files = fs.readdirSync(workDir).filter(file => !file.endsWith(".part"));
    if (!files.length) throw new Error("yt-dlp completed without creating a media file.");
    const filePath = path.join(workDir, files[0]);
    const title = path.basename(filePath).replace(/\s*\[[^\]]+\]\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || `${platform} download`;
    return { filePath, title, platform, workDir, log: result.stderr };
  } catch (error) {
    fs.rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

function cleanupDownload(result) {
  if (result?.workDir) fs.rmSync(result.workDir, { recursive: true, force: true });
}

module.exports = { YTDLP, downloadSocial, cleanupDownload, getPlatform };
