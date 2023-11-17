const { AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {
  name: 'moopause',
  description: 'Pause or resume the music',
  execute(message, args, client) {
    const player = client.player;
    if (!player) {
      return message.reply('No music is currently playing.');
    }
    if (player.state.status === AudioPlayerStatus.Playing) {
      player.pause();
      message.channel.send("Paused the music.");
    } else if (player.state.status === AudioPlayerStatus.Paused) {
      player.unpause();
      message.channel.send("Resumed the music.");
    } else {
      message.reply("Cannot pause or resume at this moment.");
    }
  },
};
