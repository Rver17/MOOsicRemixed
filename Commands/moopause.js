const { AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {
  name: 'moopause',
  description: 'Pause or resume the music',
  async execute(interactionOrMessage, args, client) {
    const player = client.player;
    if (!player) {
      const replyText = 'No music is currently playing.';
      if (interactionOrMessage.reply) {
        return interactionOrMessage.reply(replyText);
      } else {
        return interactionOrMessage.channel.send(replyText);
      }
    }

    let responseText = '';
    if (player.state.status === AudioPlayerStatus.Playing) {
      player.pause();
      responseText = "Paused the music.";
    } else if (player.state.status === AudioPlayerStatus.Paused) {
      player.unpause();
      responseText = "Resumed the music.";
    } else {
      responseText = "Cannot pause or resume at this moment.";
    }

    if (interactionOrMessage.reply) {
      await interactionOrMessage.reply(responseText);
    } else {
      interactionOrMessage.channel.send(responseText);
    }
  },
};
