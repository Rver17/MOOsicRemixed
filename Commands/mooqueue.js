const { queue } = require("./mooplay");

module.exports = {
  name: "mooqueue",
  description: "List all songs in the queue",
  execute(message, args) {
    if (queue.length === 0) {
      return message.channel.send("The queue is empty.");
    }

    // Create a string to display the queue
    const queueList = queue.map((song) => {
      return `Song ${song.songNumber}: \`${song.videoTitle}\``;
    });

    message.channel.send(`**Queue:**\n${queueList.join("\n")}`);
  },
};
