module.exports = {
  command: "ping",
  description: "Check bot response",
  async run({ reply }) {
    await reply("🏓 Pong! BLAZE-MD is working.");
  }
};
