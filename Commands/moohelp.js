module.exports = {
  name: "moohelp",
  description: "Shows all available commands",
  execute(message, args, client) {
    const helpText = `
        **MOOsic Bot Command List:**
        **!mooplay [YouTube Link/Title]** - Plays music. Accepts YouTube links or search terms.
        **!mooqueue** - Displays the current music queue.
        **!moopause** - Pauses or unpauses the currently playing music.
        **!moostop** - Stops the music player and disconnects the bot from the voice channel.
        **!mooskip** - Skips the current song and plays the next one in the queue.
      `;

    // Send the help text to the same channel where the command was called
    message.channel.send(helpText);
  },
};
