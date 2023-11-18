require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const MusicQueueManager = require('./Components/MusicQueueManager'); 
const commandHandler = require('./Components/Main/commandHandler'); 
const eventHandlers = require('./Components/Main/eventHandlers');
const config = require('./config'); 

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not defined in your environment');
}

const client = new Client({
  intents: config.intents || [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const queueManager = new MusicQueueManager();
client.commands = commandHandler.loadCommands("./Commands");

client.on("interactionCreate", (interaction) => eventHandlers.handleInteractionCreate(interaction, client, queueManager));
client.on("ready", () => eventHandlers.handleReady(client));
client.on("messageCreate", (message) => eventHandlers.handleMessageCreate(message, client, queueManager));

const initializeBot = async () => {
    try {
        await client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
        console.error("Failed to login:", error);
    }
};

initializeBot();
