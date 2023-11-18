const { playNextSong, stopPlayback, state, queue } = require('./mooplay');

module.exports = {
  name: "mooskip",
  description: "Skip the current song",
  execute(message, args, client) {
    if (!client.player || !state.isPlaying) {
      return message.channel.send("No song is currently playing!");
    }

    // Stop the current song
    client.player.stop();

    // Check if there are more songs in the queue
    if (queue.length > 0) {
      // Play the next song without sending the "Now playing" message
      playNextSong(client, message, false);
    } else {
      // No more songs, stop playback
      stopPlayback(client);
      message.channel.send("No more songs in the queue.");
    }
  }
};
