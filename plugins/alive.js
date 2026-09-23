module.exports = {
  command: "alive",
  description: "Show bot status",
  async run({ reply, config }) {
    await reply(`✅ ${config.botName} is online!\nOwner: ${config.ownerName}`);
  }
};
