import { inject, injectable } from "inversify";
import moment = require("moment");
import { InvalidSongUrlError, SongAlreadyInQueueError } from "../errors";
import { Logger, LogType } from "../logger";
import { ISong, RequestSource, SocketMessageType, SongSource } from "../models";
import SpotifyService from "./spotifyService";
import WebsocketService from "./websocketService";
import { YoutubeService } from "./youtubeService";
import { EventLogService } from "./eventLogService";

@injectable()
export class SongService {
    private songQueue: ISong[] = [];
    private nextSongId: number = 1;

    constructor(
        @inject(YoutubeService) private youtubeService: YoutubeService,
        @inject(SpotifyService) private spotifyService: SpotifyService,
        @inject(WebsocketService) private websocketService: WebsocketService,
        @inject(EventLogService) private eventLogService: EventLogService
    ) {
        //
    }

    /**
     * Helper function to test whether an object implements the ISong interface.
     * @param obj The object to test.
     */
    private isSong(obj: any): obj is ISong {
        return "id" in obj && "title" in obj && "requestedBy" in obj && "source" in obj;
    }

    /**
     * Parses a URL to get the video source and ID. This is used in API calls to get details about the video.
     * @param {string} url Video URL to parse
     */
    private parseUrl(url: string): ISong {
        // https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1

        const song: ISong = {} as ISong;

        const id = this.youtubeService.parseYoutubeUrl(url);
        if (id) {
            song.source = SongSource.Youtube;
            song.sourceId = id;
        } else {
            const sid = this.spotifyService.parseSpotifyUrl(url);
            if (sid) {
                song.source = SongSource.Spotify;
                song.sourceId = sid;
            } else {
                // Not a youtube url. Parse other urls in future
                throw new InvalidSongUrlError("URL is not a valid YouTube URL.");
            }
        }

        song.id = this.nextSongId++;
        song.sourceUrl = url;
        return song;
    }

    /**
     * Get details for a song from the songs source API (Youtube, Spotify, etc).
     * @param song The song to get details for.
     */
    private async getSongDetails(song: ISong): Promise<ISong> {
        switch (song.source) {
            case SongSource.Youtube: {
                const songDetails = await this.youtubeService.getSongDetails(song.sourceId);
                if (songDetails) {
                    song.details = {
                        title: songDetails.snippet.title,
                        duration: this.youtubeService.getSongDuration(songDetails),
                        sourceId: song.sourceId,
                        source: song.source,
                    };
                    song.previewData = {
                        linkUrl: song.sourceUrl,
                        previewUrl: this.youtubeService.getSongPreviewUrl(songDetails),
                    };
                } else {
                    throw new InvalidSongUrlError("Song details could not be loaded.");
                }
                break;
            }
            case SongSource.Spotify: {
                const songDetails = await this.spotifyService.getSongDetails(song.sourceId);
                if (songDetails) {
                    song.details = {
                        title: songDetails.name,
                        duration: this.spotifyService.getSongDuration(songDetails),
                        sourceId: song.sourceId,
                        source: song.source,
                    };
                    song.previewData = {
                        linkUrl: song.sourceUrl,
                        previewUrl: this.spotifyService.getSongPreviewUrl(songDetails),
                    };
                } else {
                    throw new InvalidSongUrlError("Song details could not be loaded.");
                }
                break;
            }
        }
        return song;
    }

    /**
     * Add a song to the song queue.
     * @param url The url of the song to add to the queue.
     * @param requestSource The source of the request (Donation, Bits, Subscription, Raffle).
     * @param username The username that is requesting the song to be added.
     */
    public async addSong(url: string, requestSource: RequestSource, username: string): Promise<ISong> {
        try {
            let song = this.parseUrl(url);

            const existingSong = Object.values(this.songQueue).filter((s) => {
                return s.sourceId === song.sourceId && s.source === song.source;
            })[0];

            if (existingSong) {
                throw new SongAlreadyInQueueError("Song has already been added to the queue.");
            }

            song = await this.getSongDetails(song);
            this.songQueue.push(song);
            Logger.info(LogType.Song, `${song.source}:${song.sourceId} added to Song Queue`);
            song.requestedBy = username;
            song.requestSource = requestSource;
            song.requestTime = moment.now();

            this.eventLogService.addSongRequest(username, {
                message: "Song was requested.",
                song: {
                    title: song.details.title,
                    requestedBy: song.requestedBy,
                    requestSource: song.requestSource,
                    songSource: song.source,
                    url,
                },
            });
            this.websocketService.send({
                type: SocketMessageType.SongAdded,
                message: "Song Added",
                data: song,
                username,
            });

            return song;
        } catch (err) {
            if (err instanceof InvalidSongUrlError) {
                Logger.info(LogType.Song, `${url} is an invalid song url.`);
                throw err;
            } else {
                throw err;
            }
        }
    }

    /**
     * Set a song in the queue to Played status.
     * @param song The song or song id to update.
     */
    public songPlayed(song: ISong | number): void;
    public songPlayed(song: any): void {
        if (typeof song === "number") {
            const songToChange =
                this.songQueue.filter((item) => {
                    return item.id === song;
                })[0] || undefined;
            if (songToChange) {
                const songIndex = this.songQueue.indexOf(songToChange);
                this.songQueue[songIndex].beenPlayed = true;
                this.eventLogService.addSongPlayed(this.songQueue[songIndex].requestedBy, {
                    message: "Song has been played.",
                    song: {
                        title: this.songQueue[songIndex].details.title,
                    },
                });
                this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
                    data: this.songQueue[songIndex],
                });
            }
        } else if (typeof song === "object" && song.type === "isong") {
            const songData =
                this.songQueue.filter((item) => {
                    return item.id === song.id;
                })[0] || undefined;
            if (songData) {
                const songIndex = this.songQueue.indexOf(songData);
                this.songQueue[songIndex].beenPlayed = true;
                this.eventLogService.addSongPlayed(song.requestedBy, {
                    message: "Song has been played.",
                    song: {
                        title: song.details.title,
                    },
                });
                this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
                    data: song,
                });
            }
        }
    }

    /**
     * Moves a song to the top of the song queue.
     * @param song The song or song id to remove.
     */
    public moveSongToTop(song: ISong | number): void;
    public moveSongToTop(song: any): void {
        if (typeof song === "number") {
            const songToMove =
                this.songQueue.filter((item) => {
                    return item.id === song;
                })[0] || undefined;
            if (songToMove) {
                const songIndex = this.songQueue.indexOf(songToMove);
                this.songQueue.splice(songIndex, 1);
                this.songQueue.splice(0, 0, songToMove);

                this.websocketService.send({
                    type: SocketMessageType.SongMovedToTop,
                    message: "Song moved to top",
                    data: songToMove,
                });
            }
        } else if (this.isSong(song)) {
            const songData =
                this.songQueue.filter((item) => {
                    return item.id === song.id;
                })[0] || undefined;
            if (songData) {
                const index = this.songQueue.indexOf(songData);
                this.songQueue.splice(index, 1);
                this.songQueue.splice(0, 0, song);

                this.websocketService.send({
                    type: SocketMessageType.SongMovedToTop,
                    message: "Song moved to top",
                    data: song,
                });
            }
        }
    }

    /**
     * Remove a song from the song queue.
     * @param song The song or song id to remove.
     */
    public removeSong(song: ISong | number): void;
    public removeSong(song: any): void {
        if (typeof song === "number") {
            const songToDelete =
                this.songQueue.filter((item) => {
                    return item.id === song;
                })[0] || undefined;
            if (songToDelete) {
                const songIndex = this.songQueue.indexOf(songToDelete);
                const songData = this.songQueue[songIndex];
                this.songQueue.splice(songIndex, 1);

                this.eventLogService.addSongRemoved(songData.requestedBy, {
                    message: "Song has been removed from request queue.",
                    song: {
                        title: songData.details.title,
                        requestedBy: songData.requestedBy,
                    },
                });

                this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: songData,
                });
            }
        } else if (this.isSong(song)) {
            const songData =
                this.songQueue.filter((item) => {
                    return item.id === song.id;
                })[0] || undefined;
            if (songData) {
                const index = this.songQueue.indexOf(songData);
                this.songQueue.splice(index, 1);

                this.eventLogService.addSongRemoved(song.requestedBy, {
                    message: "Song has been removed from request queue.",
                    song: {
                        title: song.details.title,
                        requestedBy: song.requestedBy,
                    },
                });
                this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: song,
                });
            }
        }
    }

    /**
     * Get the list of songs in the song queue.
     */
    public getSongQueue(): ISong[] {
        return this.songQueue;
    }

    /**
     * Get the list of songs in the song queue requested by a specific user.
     * @param username The user to get the list of songs for.
     */
    public getSongsByUsername(username: string): ISong[] {
        const userSongs = Object.values(this.songQueue).filter((song) => {
            return song.requestedBy === username;
        });
        return userSongs;
    }
}

export default SongService;
