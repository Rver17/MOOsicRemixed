// eventHandlers.js

const handleInteractionCreate = async (interaction, client, queueManager) => {
    if (!interaction.isButton()) return;

    const { customId } = interaction;
    if (!["moopause", "mooskip", "moostop"].includes(customId)) return;

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
        await musicCommand.execute(interaction, [], client, queueManager);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error executing that command!",
            ephemeral: true,
        });
    }
};

const handleReady = (client) => {
    console.log(`Logged in as ${client.user.tag}!`);
};

const handleMessageCreate = async (message, client, queueManager) => {
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
};

module.exports = {
    handleInteractionCreate,
    handleReady,
    handleMessageCreate
};
