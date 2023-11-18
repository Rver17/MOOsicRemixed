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

// Create a Map to store guild-specific queues
const guildQueues = new Map();

function getGuildQueue(guildId) {
  if (!guildQueues.has(guildId)) {
    guildQueues.set(guildId, {
      songs: [],
      totalSongsPlayed: 0,
      isPlaying: false,
      player: null,
      connection: null,
    });
  }
  return guildQueues.get(guildId);
}

let totalSongsPlayed = 0;
const state = {
  isPlaying: false,
}; // Flag to track if a song is currently playing

function createProgressBar(current, total) {
  const totalBars = 10;
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

async function playNextSong(client, guildId, sendNowPlayingMessage = true) {
  const queue = getGuildQueue(guildId);
  if (queue.songs.length > 0) {
    const nextSong = queue.songs.shift();
    console.log(`Playing next song: ${nextSong.videoTitle}`);

    try {
      const stream = ytdl(nextSong.videoUrl, { filter: "audioonly" });
      const resource = createAudioResource(stream);

      queue.player.play(resource);
      queue.isPlaying = true;

      client.user.setActivity(nextSong.videoTitle, { type: "PLAYING" });

      if (sendNowPlayingMessage) {
        const nowPlayingMessage = await client.channels.cache
          .get(nextSong.textChannelId)
          .send(
            `Now playing (Song ${nextSong.songNumber}): [**${nextSong.videoTitle}**]`
          );

        clearInterval(queue.progressInterval);

        let currentTime = 0;
        queue.progressInterval = setInterval(async () => {
          currentTime += 15;
          if (currentTime > nextSong.duration) {
            clearInterval(queue.progressInterval);
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
      client.channels.cache
        .get(nextSong.textChannelId)
        .send("Error playing the next song in the queue.");
    }
  } else {
    console.log("No more songs to play, setting isPlaying to false");
    queue.isPlaying = false;
    queue.totalSongsPlayed = 0;
    clearInterval(queue.progressInterval);
    client.user.setActivity();
  }
}

function stopPlayback(client, guildId) {
  const queue = getGuildQueue(guildId);
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

function clearQueue(guildId) {
  const queue = getGuildQueue(guildId);
  queue.songs = [];
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

    const guildId = message.guild.id;
    const queue = getGuildQueue(guildId);

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

    // Initialize the player for the guild if it doesn't exist
    if (!queue.player) {
      queue.player = createAudioPlayer();
      queue.player.on(AudioPlayerStatus.Idle, () => {
        if (queue.songs.length > 0) {
          playNextSong(client, guildId);
        } else {
          queue.isPlaying = false;
        }
      });
    }

    if (!queue.connection) {
      queue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Attach event listeners to the guild-specific connection
      queue.connection.on(VoiceConnectionStatus.Disconnected, (reason) => {
        console.log("Connection disconnected, reason:", reason);
        clearQueue(guildId);
        stopPlayback(client, guildId);
      });

      queue.connection.on(VoiceConnectionStatus.Connecting, () => {
        console.log("Voice connection is connecting");
      });

      queue.connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("Voice connection is ready");
      });

      queue.connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log("Voice connection is destroyed");
      });
    }

    if (queue.songs.length === 0 && !queue.isPlaying) {
      queue.totalSongsPlayed++;
      queue.songs.push({
        resource,
        videoTitle,
        videoUrl,
        songNumber: queue.totalSongsPlayed,
        duration: videoDuration,
        textChannelId: message.channel.id, // Store the text channel ID here
      });
      queue.isPlaying = true;
      playNextSong(client, guildId);

      const nowPlayingMessage = await message.channel.send(
        `Now playing (Song ${queue.totalSongsPlayed}): [**${videoTitle}**](${videoUrl})`
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

      }, 15000);
    } else {
      queue.totalSongsPlayed++;
      queue.songs.push({
        resource,
        videoTitle,
        videoUrl,
        songNumber: queue.totalSongsPlayed,
      });
      message.channel.send(
        `Added to queue (Song ${queue.totalSongsPlayed}): [**${videoTitle}**](${videoUrl})`
      );
    }

    queue.connection.subscribe(queue.player);

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
  getGuildQueue,
  playNextSong,
  stopPlayback,
  clearQueue,
  state,
};
