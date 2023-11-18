const { AudioPlayerStatus } = require("@discordjs/voice");
const { getGuildQueue } = require("./mooplay");

module.exports = {
  name: 'moostop',
  description: 'Stop the music and leave the channel',
  execute(message, args, client) {
    const guildId = message.guild.id;
    const queue = getGuildQueue(guildId);

    if (!queue.connection) {
      return message.reply('Not connected to any voice channel.');
    }

    if (queue.player && queue.player.state.status !== AudioPlayerStatus.Idle) {
      queue.player.stop();
      queue.connection.destroy();
      queue.connection = null;
      queue.player = null;
      queue.songs = [];
      queue.isPlaying = false;
      message.channel.send("Stopped the music and left the channel.");
    } else {
      message.reply("No music is currently playing.");
    }
  },
};
