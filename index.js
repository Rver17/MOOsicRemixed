require("dotenv").config();

const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

const MusicQueueManager = require('./Components/MusicQueueManager'); // Adjust path as needed
const queueManager = new MusicQueueManager();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Map();
client.player = null;
client.connection = null;

const commandFiles = fs
  .readdirSync("./Commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./Commands/${file}`);
  client.commands.set(command.name, command);
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;
  if (!["moopause", "mooskip", "moostop"].includes(customId)) return;

  // Ensure the interaction is in a guild and the member is in a voice channel
  if (!interaction.inGuild() || !interaction.member.voice.channel) {
    await interaction.reply({
      content: "You need to be in a voice channel to use these controls!",
      ephemeral: true,
    });
    return;
  }

  const musicCommand = client.commands.get(customId);
  if (!musicCommand) {
    await interaction.reply({
      content: "This command isn't implemented yet!",
      ephemeral: true,
    });
    return;
  }

  try {
    // Execute the corresponding command, passing the interaction as the first parameter
    await musicCommand.execute(interaction, [], client, queueManager); // Note: 'args' is passed as an empty array
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing that command!",
      ephemeral: true,
    });
  }
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (!client.commands.has(commandName)) return;

  const command = client.commands.get(commandName);
  try {
    command.execute(message, args, client, queueManager);
  } catch (error) {
    console.error(error);
    message.channel.send("There was an error executing that command!");
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
