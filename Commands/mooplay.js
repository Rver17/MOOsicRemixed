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

// Create a queue to store songs
const queue = [];

module.exports = {
  name: "mooplay",
  description: "Play a song from YouTube",
  async execute(message, args, client) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
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

    // Create an audio resource for the new song
    const stream = ytdl(videoUrl, { filter: "audioonly" });
    const resource = createAudioResource(stream);

    if (client.player && client.connection) {
      // Calculate the song position in the queue
      const songPosition = queue.length + 1;
      // Add the new song to the queue
      queue.push({ resource, videoTitle, videoUrl });
      message.channel.send(
        `Added to queue (Song ${songPosition}): [**${videoTitle}**](${videoUrl})`
      );
    } else {
      // Create a new player and connection if none exists
      const player = createAudioPlayer();
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      client.player = player;
      client.connection = connection;

      try {
        connection.on(VoiceConnectionStatus.Ready, () => {
          if (connection && connection.voice) {
            try {
              connection.voice.setSelfDeaf(true);
            } catch (err) {
              console.error("Error setting self-deaf:", err);
            }
          }
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          setTimeout(() => {
            if (
              connection.state.status === VoiceConnectionStatus.Disconnected
            ) {
              connection.destroy();
            }
          }, 5000);
        });

        player.play(resource);
        connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => {
          // Check if there are songs in the queue
          if (queue.length > 0) {
            const nextSong = queue.shift();
            const songPosition = queue.length + 1; // Calculate the correct song position
            player.play(nextSong.resource);
            message.channel.send(
              `Now playing (Song ${songPosition}): [**${nextSong.videoTitle}**](${nextSong.videoUrl})`
            );
          } else {
            player.stop();
            connection.destroy();
          }
        });

        // Send a message with the currently playing song
        message.channel.send(
          `Now playing (Song 1): [**${videoTitle}**](${videoUrl})`
        );
      } catch (err) {
        console.error(err);
        message.channel.send(
          "An error occurred while trying to play the audio."
        );
      }
    }
  },
};
