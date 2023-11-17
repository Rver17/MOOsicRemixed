const ytdl = require("ytdl-core");
const { 
  joinVoiceChannel, 
  createAudioResource, 
  createAudioPlayer, 
  AudioPlayerStatus, 
  VoiceConnectionStatus 
} = require("@discordjs/voice");

module.exports = {
  name: 'mooplay',
  description: 'Play a song from YouTube',
  async execute(message, args, client) { 
    if (!args.length) {
      return message.channel.send("Please provide a YouTube URL.");
    }
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send("You need to be in a voice channel to play music!");
    }

    const player = createAudioPlayer();
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    // Update client's player and connection
    client.player = player;
    client.connection = connection;

    try {
      const stream = ytdl(args[0], { filter: "audioonly" });
      const resource = createAudioResource(stream);

      connection.on(VoiceConnectionStatus.Ready, () => {
        if (connection && connection.voice) {
          try {
            connection.voice.setSelfDeaf(true);
          } catch (err) {
            console.error("Error setting self deaf:", err);
          }
        }
      });

      // Handle potential disconnections
      connection.on(VoiceConnectionStatus.Disconnected, () => {
        setTimeout(() => {
          if (connection.state.status === VoiceConnectionStatus.Disconnected) {
            connection.destroy();
          }
        }, 5000);
      });

      player.play(resource);
      connection.subscribe(player);
      player.on(AudioPlayerStatus.Idle, () => {
        player.stop();
        connection.destroy();
      });
    } catch (err) {
      console.error(err);
      message.channel.send("An error occurred while trying to play the audio.");
    }
  },
};
