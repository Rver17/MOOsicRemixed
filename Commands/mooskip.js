const { playNextSong, stopPlayback } = require("./mooplay");

module.exports = {
  name: "mooskip",
  description: "Skip the current song",
  execute(message, args, client, queueManager) {
    const guildQueue = queueManager.getQueue(message.guild.id);

    if (!guildQueue.player || !guildQueue.isPlaying) {
      return message.channel.send("No song is currently playing!");
    }

    guildQueue.player.stop();

    if (guildQueue.songs.length > 0) {
      playNextSong(client, message.guild.id, false, queueManager);
    } else {
      stopPlayback(client, message.guild.id, queueManager);
      message.channel.send("No more songs in the queue.");
    }
  },
};
