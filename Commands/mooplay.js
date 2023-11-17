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

// Create a queue to store songs and a variable to track total songs played
const queue = [];
let totalSongsPlayed = 0;

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
    let videoTitle = "";

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
      videoTitle = searchResults.results[0].title;
    }

    const stream = ytdl(videoUrl, { filter: "audioonly" });
    const resource = createAudioResource(stream);

    if (client.player && client.connection) {
      totalSongsPlayed++;
      const songNumber = totalSongsPlayed;
      queue.push({ resource, videoTitle, videoUrl, songNumber });
      message.channel.send(
        `Added to queue (Song ${songNumber}): [**${videoTitle}**](${videoUrl})`
      );
    } else {
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

        totalSongsPlayed++;
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
          if (queue.length > 0) {
            const nextSong = queue.shift();
            message.channel.send(
              `Finished playing (Song ${nextSong.songNumber}): [**${nextSong.videoTitle}**](${nextSong.videoUrl})`
            );

            if (queue.length > 0) {
              const nextSong = queue[0];
              player.play(nextSong.resource);
              message.channel.send(
                `Now playing (Song ${nextSong.songNumber}): [**${nextSong.videoTitle}**](${nextSong.videoUrl})`
              );
            } else {
              player.stop();
              connection.destroy();
              // Reset totalSongsPlayed when queue is empty
              totalSongsPlayed = 0;
            }
          } else {
            player.stop();
            connection.destroy();
            // Reset totalSongsPlayed when queue is empty
            totalSongsPlayed = 0;
          }
        });

        message.channel.send(
          `Now playing (Song ${totalSongsPlayed}): [**${videoTitle}**](${videoUrl})`
        );
      } catch (err) {
        console.error(err);
        message.channel.send(
          "An error occurred while trying to play the audio."
        );
      }
    }
  },
  queue,
};
