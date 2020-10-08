import { inject, injectable } from "inversify";
import { InvalidSongUrlError } from "../errors";
import { Logger, LogType } from "../logger";
import { ISong, SongSource } from "../models";
import { YoutubeService } from "./youtubeService";

@injectable()
export class SongService {
    private songQueue: { [key: number]: ISong } = {};
    private nextSongId: number = 1;

    constructor(
        @inject(YoutubeService) private youtubeService: YoutubeService
    ) {
        //
    }

    private isSong(obj: any): obj is ISong {
        return (
            "id" in obj &&
            "title" in obj &&
            "requestedBy" in obj &&
            "source" in obj
        );
    }

    private parseYoutubeUrl(url: string): string | undefined {
        if (url.indexOf("youtu.be") > -1) {
            // Short Youtube URL
            const id = url.slice(url.lastIndexOf("/"), url.indexOf("?"));
            return id;
        } else if (url.indexOf("youtube") > -1) {
            if (url.indexOf("&") > -1) {
                return url.slice(url.indexOf("?v=") + 3, url.indexOf("&"));
            } else {
                return url.slice(url.indexOf("?v=") + 3);
            }
        } else {
            return undefined;
        }
    }

    /**
     * Parses a URL to get the video source and ID. This is used in API calls to get details about the video.
     * @param {string} url Video URL to parse
     */
    private parseUrl(url: string): ISong {
        // https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1

        const song: ISong = {} as ISong;

        const id = this.parseYoutubeUrl(url);
        if (id) {
            song.source = SongSource.Youtube;
            song.sourceId = id;
        } else {
            // Not a youtube url. Parse other urls in future
            throw new InvalidSongUrlError("URL is not a valid YouTube URL.");
        }

        song.id = this.nextSongId++;
        return song;
    }

    private async getSongDetails(song: ISong): Promise<ISong> {
        switch (song.source) {
            case SongSource.Youtube: {
                const songDetails = await this.youtubeService.getSongDetails(
                    song.sourceId
                );
                if (songDetails) {
                    song.title = songDetails.snippet.title;
                    song.duration = this.youtubeService.getSongDuration(
                        songDetails
                    );
                }
                break;
            }
        }
        return song;
    }

    public async addSong(url: string, username: string): Promise<ISong> {
        try {
            let song = this.parseUrl(url);
            song = await this.getSongDetails(song);
            this.songQueue[song.id] = song;
            Logger.info(
                LogType.Song,
                `${song.source}:${song.sourceId} added to Song Queue`
            );
            song.requestedBy = username;
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

    public songPlayed(song: ISong | number): void;
    public songPlayed(song: any): void {
        if (typeof song === "number") {
            if (Object.keys(this.songQueue).includes(song.toString())) {
                this.songQueue[song].beenPlayed = true;
            }
        } else if (typeof song === "object" && song.type === "isong") {
            if (Object.keys(this.songQueue).includes(song.id.toString())) {
                this.songQueue[song.id].beenPlayed = true;
            }
        }
    }

    public removeSong(song: ISong | number): void;
    public removeSong(song: any): void {
        if (typeof song === "number") {
            if (Object.keys(this.songQueue).includes(song.toString())) {
                delete this.songQueue[song];
            }
        } else if (this.isSong(song)) {
            if (Object.keys(this.songQueue).includes(song.id.toString())) {
                delete this.songQueue[song.id];
            }
        }
    }

    public removeSongForUser(username: string): void {
        const userSongs = this.getSongsByUsername(username);
        if (userSongs.length > 0) {
            userSongs.forEach((song) => {
                this.removeSong(song);
            });
        }
    }

    public getSongQueue(): ISong[] {
        return Object.values(this.songQueue);
    }

    public getSongsByUsername(username: string): ISong[] {
        const userSongs = Object.values(this.songQueue).filter((song) => {
            return song.requestedBy === username;
        });
        return userSongs;
    }
}

export default SongService;
