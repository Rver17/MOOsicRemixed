const { GatewayIntentBits } = require("discord.js");

module.exports = {
    // Discord Bot Token (it's recommended to keep the token in environment variables)
    discordBotToken: process.env.DISCORD_BOT_TOKEN,

    // Bot command prefix
    prefix: "!",

    // Discord Gateway Intents
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],

    // Any other configurations you might need
    // Example: database settings, API keys (if any), feature toggles, etc.
};
