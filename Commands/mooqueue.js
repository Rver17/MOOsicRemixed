const { getGuildQueue } = require("./mooplay");

module.exports = {
  name: "mooqueue",
  description: "List all songs in the queue",
  execute(message, args) {
    const guildQueue = getGuildQueue(message.guild.id);

    if (!guildQueue || guildQueue.songs.length === 0) {
      return message.channel.send("The queue is empty.");
    }

    const queueList = guildQueue.songs.map((song, index) => {
      return `Song ${index + 1}: \`${song.videoTitle}\``;
    });

    message.channel.send(`**Queue:**\n${queueList.join("\n")}`);
  },
};
