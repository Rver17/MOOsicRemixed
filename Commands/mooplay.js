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
const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

// Create a queue to store songs and variables to track total songs played and playing state
const queue = [];
let totalSongsPlayed = 0;
const state = {
  isPlaying: false,
}; // Flag to track if a song is currently playing

function createProgressBar(current, total) {
  const totalBars = 20;
  const currentBars = Math.round((current / total) * totalBars);
  const remainingBars = totalBars - currentBars;
  const progressBar =
    "▬".repeat(currentBars) + "🔘" + "▬".repeat(remainingBars);
  return progressBar;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

let progressInterval;

async function getVideoDuration(videoUrl) {
  try {
    const info = await ytdl.getInfo(videoUrl);
    return parseInt(info.videoDetails.lengthSeconds, 10); // Duration in seconds
  } catch (error) {
    console.error("Error fetching video details: ", error);
    return 0; // Return 0 if unable to fetch the duration
  }
}

async function playNextSong(client, message, sendNowPlayingMessage = true) {
  console.log("playNextSong function called");
  if (queue.length > 0) {
    const nextSong = queue.shift();
    console.log(`Playing next song: ${nextSong.videoTitle}`);

    try {
      const stream = ytdl(nextSong.videoUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);

      client.player.play(resource);
      state.isPlaying = true;

      client.user.setActivity(nextSong.videoTitle, { type: "PLAYING" });

      if (sendNowPlayingMessage) {
        const nowPlayingMessage = await message.channel.send(
          `Now playing (Song ${nextSong.songNumber}): [**${nextSong.videoTitle}**]`
        );

        clearInterval(progressInterval);

        let currentTime = 0;

        progressInterval = setInterval(async () => {
          currentTime += 15;
          if (currentTime > nextSong.duration) {
            clearInterval(progressInterval);
            return;
          }

          const progressBar = createProgressBar(currentTime, nextSong.duration);
          const formattedTime = formatTime(currentTime);
          const formattedDuration = formatTime(nextSong.duration);

          await nowPlayingMessage.edit(
            `${progressBar} (${formattedTime}/${formattedDuration})`
          );
        }, 15000);
      }
    } catch (error) {
      console.error("Error playing next song:", error);
      message.channel.send("Error playing the next song in the queue.");
    }
  } else {
    console.log("No more songs to play, setting isPlaying to false");
    state.isPlaying = false;
    totalSongsPlayed = 0;

    clearInterval(progressInterval);
    client.user.setActivity();
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
    let videoDuration = 0;

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
      videoDuration = await getVideoDuration(videoUrl);
    } else {
      console.log("Valid URL, fetching video details");
      try {
        const videoInfo = await ytdl.getInfo(videoUrl);
        videoTitle = videoInfo.videoDetails.title;
        videoDuration = parseInt(videoInfo.videoDetails.lengthSeconds, 10);
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
        duration: videoDuration,
      });

      const nowPlayingMessage = await message.channel.send(
        `Now playing (Song ${totalSongsPlayed}): [**${videoTitle}**](${videoUrl})`
      );

      client.user.setActivity(videoTitle, { type: "PLAYING" });

      clearInterval(progressInterval);

      let currentTime = 0;

      progressInterval = setInterval(async () => {
        currentTime += 15;
        if (currentTime > videoDuration) {
          clearInterval(progressInterval);
          return;
        }

        const progressBar = createProgressBar(currentTime, videoDuration);
        const formattedTime = formatTime(currentTime);
        const formattedDuration = formatTime(videoDuration);

        await nowPlayingMessage.edit(
          `${progressBar} (${formattedTime}/${formattedDuration})`
        );
      }, 15000);
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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("moopause")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("▶️"),
      new ButtonBuilder()
        .setCustomId("mooskip")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⏭️"),
      new ButtonBuilder()
        .setCustomId("moostop")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("⏹️")
    );

    const controlEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Music Controls")
      .setDescription("Use the buttons below to control the music!");

    await message.channel.send({ embeds: [controlEmbed], components: [row] });
  },
  queue,
  playNextSong,
  stopPlayback,
  clearQueue,
  state,
};
