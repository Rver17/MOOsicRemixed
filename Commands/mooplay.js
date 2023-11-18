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

// Create a queue to store songs and variables to track total songs played and playing state
const queue = [];
let totalSongsPlayed = 0;
const state = {
  isPlaying: false,
}; // Flag to track if a song is currently playing

module.exports = {
  name: "mooplay",
  description: "Play a song from YouTube",
  async execute(message, args, client) {
    console.log("Execute function called");
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );
    }

    let videoUrl = args[0];
    let videoTitle = "";

    if (!ytdl.validateURL(videoUrl)) {
      console.log("Invalid URL, searching on YouTube");
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
    } else {
      console.log("Valid URL, fetching video details");
      try {
        const videoInfo = await ytdl.getInfo(videoUrl);
        videoTitle = videoInfo.videoDetails.title;
      } catch (error) {
        console.error("Error fetching video details: ", error);
        return message.channel.send(
          "There was an error fetching video details."
        );
      }
    }

    const stream = ytdl(videoUrl, { filter: "audioonly" });
    const resource = createAudioResource(stream);

    if (!client.player) {
      console.log("Creating a new audio player");
      client.player = createAudioPlayer();

      client.player.on(AudioPlayerStatus.Idle, () => {
        console.log("Player is idle");
        if (queue.length > 0) {
          console.log("Queue has songs, playing next song");
          playNextSong(client, message);
        } else if (!state.isPlaying) {
          console.log("No songs in queue, stopping playback");
          stopPlayback(client);
        }
      });
    }

    if (!client.connection) {
      console.log("Joining voice channel");
      client.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      client.connection.on(VoiceConnectionStatus.Disconnected, (reason) => {
        console.log("Connection disconnected, reason:", reason);
        console.log("Clearing queue and stopping playback");
        clearQueue();
        stopPlayback(client);
      });

      client.connection.on(VoiceConnectionStatus.Connecting, () => {
        console.log("Voice connection is connecting");
      });

      client.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("Voice connection is ready");
      });

      client.connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log("Voice connection is destroyed");
      });
    }

    if (queue.length === 0 && !state.isPlaying) {
      console.log("Queue is empty, playing new song");
      totalSongsPlayed++;
      client.player.play(resource);
      state.isPlaying = true;
      queue.push({
        resource,
        videoTitle,
        videoUrl,
        songNumber: totalSongsPlayed,
      });
      message.channel.send(
        `Now playing (Song ${totalSongsPlayed}): [**${videoTitle}**](${videoUrl})`
      );
    } else {
      console.log("Adding song to queue");
      totalSongsPlayed++;
      const songNumber = totalSongsPlayed;
      queue.push({ resource, videoTitle, videoUrl, songNumber });
      message.channel.send(
        `Added to queue (Song ${songNumber}): [**${videoTitle}**](${videoUrl})`
      );
    }

    client.connection.subscribe(client.player);
  },
  queue,
};

function playNextSong(client, message, sendNowPlayingMessage = true) {
  console.log("playNextSong function called");
  if (queue.length > 0) {
    const nextSong = queue.shift();
    console.log(`Playing next song: ${nextSong.videoTitle}`);
    client.player.play(nextSong.resource);
    state.isPlaying = true;
    if (sendNowPlayingMessage) {
      message.channel.send(
        `Now playing (Song ${nextSong.songNumber}): [**${nextSong.videoTitle}**](${nextSong.videoUrl})`
      );
    }
  } else {
    console.log("No more songs to play, setting isPlaying to false");
    state.isPlaying = false;
  }
}

function stopPlayback(client) {
  console.log(
    "stopPlayback function called, stopping player and destroying connection"
  );
  client.player.stop();
  client.connection.destroy();
  client.connection = null;
  client.player = null;
  totalSongsPlayed = 0;
  state.isPlaying = false;
}

function clearQueue() {
  console.log("clearQueue function called, clearing queue");
  queue.length = 0;
}

module.exports.playNextSong = playNextSong;
module.exports.stopPlayback = stopPlayback;
module.exports.clearQueue = clearQueue;
module.exports.queue = queue;
module.exports.state = state;
