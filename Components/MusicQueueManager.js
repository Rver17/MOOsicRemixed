// MusicQueueManager.js
class MusicQueueManager {
    constructor() {
        this.guildQueues = new Map();
    }

    getQueue(guildId) {
        if (!this.guildQueues.has(guildId)) {
            this.guildQueues.set(guildId, {
                songs: [],
                totalSongsPlayed: 0,
                isPlaying: false,
                player: null,
                connection: null,
            });
        }
        return this.guildQueues.get(guildId);
    }

    clearQueue(guildId) {
        const queue = this.getQueue(guildId);
        queue.songs = [];
    }

    addSongToQueue(guildId, song) {
        const queue = this.getQueue(guildId);
        queue.songs.push(song);
    }

    getNextSong(guildId) {
        const queue = this.getQueue(guildId);
        if (queue.songs.length > 0) {
            return queue.songs.shift(); // Remove the first element from the queue and return it
        }
        return null;
    }

    isQueueEmpty(guildId) {
        const queue = this.getQueue(guildId);
        return queue.songs.length === 0;
    }

    startPlaying(guildId) {
        const queue = this.getQueue(guildId);
        queue.isPlaying = true;
    }

    stopPlaying(guildId) {
        const queue = this.getQueue(guildId);
        queue.isPlaying = false;
        queue.totalSongsPlayed = 0;
    }

    // You can add more methods here as necessary, such as for updating the player or connection
}

module.exports = MusicQueueManager;
