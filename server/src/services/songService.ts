import { inject, injectable } from "inversify";
import { InvalidSongUrlError } from "../errors";
import { Logger, LogType } from "../logger";
import { ISong, RequestSource, SocketMessageType, SongSource } from "../models";
import SpotifyService from "./spotifyService";
import WebsocketService from "./websocketService";
import { YoutubeService } from "./youtubeService";

@injectable()
export class SongService {
    private songQueue: { [key: number]: ISong } = {};
    private nextSongId: number = 1;

    constructor(
        @inject(YoutubeService) private youtubeService: YoutubeService,
        @inject(SpotifyService) private spotifyService: SpotifyService,
        @inject(WebsocketService) private websocketService: WebsocketService
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
                        source: song.source
                    };
                    song.previewData = {
                        linkUrl: song.sourceUrl,
                        previewUrl: this.youtubeService.getSongPreviewUrl(songDetails)
                    };
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
                        source: song.source
                    };
                    song.previewData = {
                        linkUrl: song.sourceUrl,
                        previewUrl: this.spotifyService.getSongPreviewUrl(songDetails)
                    };
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
            song = await this.getSongDetails(song);
            this.songQueue[song.id] = song;
            Logger.info(LogType.Song, `${song.source}:${song.sourceId} added to Song Queue`);
            song.requestedBy = username;
            song.requestSource = requestSource;

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
            if (Object.keys(this.songQueue).includes(song.toString())) {
                this.songQueue[song].beenPlayed = true;
                this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
                    data: this.songQueue[song],
                });
            }
        } else if (typeof song === "object" && song.type === "isong") {
            if (Object.keys(this.songQueue).includes(song.id.toString())) {
                this.songQueue[song.id].beenPlayed = true;
                this.websocketService.send({
                    type: SocketMessageType.SongPlayed,
                    message: "Song Played",
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
            if (Object.keys(this.songQueue).includes(song.toString())) {
                this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: this.songQueue[song],
                });
                delete this.songQueue[song];
            }
        } else if (this.isSong(song)) {
            if (Object.keys(this.songQueue).includes(song.id.toString())) {
                this.websocketService.send({
                    type: SocketMessageType.SongRemoved,
                    message: "Song Removed",
                    data: song,
                });
                delete this.songQueue[song.id];
            }
        }
    }

    /**
     * Remove all songs for a specific user.
     * @param username The user to remove songs for.
     */
    public removeSongForUser(username: string): void {
        const userSongs = this.getSongsByUsername(username);
        if (userSongs.length > 0) {
            userSongs.forEach((song) => {
                this.removeSong(song);
            });
        }
    }

    /**
     * Get the list of songs in the song queue.
     */
    public getSongQueue(): ISong[] {
        return Object.values(this.songQueue);
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
