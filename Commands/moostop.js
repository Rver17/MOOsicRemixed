const { AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {
  name: 'moostop',
  description: 'Stop the music and leave the channel',
  execute(message, args, client) {
    const player = client.player;
    const connection = client.connection;
    if (!connection) {
      return message.reply('Not connected to any voice channel.');
    }
    if (player && player.state.status !== AudioPlayerStatus.Idle) {
      player.stop();
      connection.destroy();
      message.channel.send("Stopped the music and left the channel.");
    } else {
      message.reply("No music is currently playing.");
    }
  },
};
