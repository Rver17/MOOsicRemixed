require("dotenv").config();

const ytdl = require("ytdl-core");
const search = require("youtube-search");
const {
  joinVoiceChannel,
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

module.exports = {
  name: "mooplay",
  description: "Play a song from YouTube",
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send("You need to be in a voice channel to play music!");
    }

    let videoUrl = args[0];
    let videoTitle = ""; // Variable to store the title of the video

    // If the first argument is not a URL, search YouTube
    if (!ytdl.validateURL(videoUrl)) {
      const opts = {
        maxResults: 1,
        key: process.env.YOUTUBE_API_KEY,
        type: "video",
      };

      const searchResults = await search(args.join(" "), opts);
      if (searchResults.results.length === 0) {
        return message.channel.send("No results found.");
      }
      videoUrl = searchResults.results[0].link;
      videoTitle = searchResults.results[0].title; // Store the title of the first search result
    }

    const player = createAudioPlayer();
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });

    client.player = player;
    client.connection = connection;

    try {
      const stream = ytdl(videoUrl, { filter: "audioonly" });
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

      if (videoTitle) {
        message.channel.send(`Now playing: **${videoTitle}**\nLink: ${videoUrl}`);
      } else {
        message.channel.send(`Now playing: ${videoUrl}`);
      }
    } catch (err) {
      console.error(err);
      message.channel.send("An error occurred while trying to play the audio.");
    }
  },
};