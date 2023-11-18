const { AudioPlayerStatus } = require("@discordjs/voice");
const { getGuildQueue } = require("./mooplay");

module.exports = {
  name: 'moopause',
  description: 'Pause or resume the music',
  async execute(interactionOrMessage, args, client) {
    const guildId = interactionOrMessage.guild.id;
    const queue = getGuildQueue(guildId);

    if (!queue.player) {
      const replyText = 'No music is currently playing.';
      if (interactionOrMessage.reply) {
        return interactionOrMessage.reply(replyText);
      } else {
        return interactionOrMessage.channel.send(replyText);
      }
    }

    let responseText = '';
    if (queue.player.state.status === AudioPlayerStatus.Playing) {
      queue.player.pause();
      responseText = "Paused the music.";
    } else if (queue.player.state.status === AudioPlayerStatus.Paused) {
      queue.player.unpause();
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
