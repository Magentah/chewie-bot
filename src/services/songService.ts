import { injectable, inject } from 'inversify';
import Song, { ISong, SongSource } from '../models/song';
import YoutubeService from './youtubeService';
import InvalidSongUrlError from '../errors/invalidSongUrl';
import Logger, { LogType } from '../logger';
import { loggers } from 'winston';

@injectable()
export class SongService {
    private songQueue: { [key: string ]: Song } = {};
    private nextSongId: number = 1;

    constructor(@inject(YoutubeService) private youtubeService: YoutubeService) {
        //
    }

    private parseYoutubeUrl(url: string): string | undefined {

        if (url.indexOf('youtu.be') > -1) {
            // Short Youtube URL
            const id = url.slice(url.lastIndexOf('/'), url.indexOf('?'));
            return id;
        } else if (url.indexOf('youtube') > -1) {
            if (url.indexOf('&') > -1) {
                return url.slice(url.indexOf('?v=') + 3, url.indexOf('&'));
            } else {
                return url.slice(url.indexOf('?v=') + 2);
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
            throw new InvalidSongUrlError('URL is not a valid YouTube URL.');
        }

        song.id = this.nextSongId++;
        return song;
    }

    private async getSongDetails(song: Song): Promise<Song> {
        switch (song.source) {
            case SongSource.Youtube: {
                const songDetails = await this.youtubeService.getSongDetails(song.sourceId);
                if (songDetails) {
                    song.title = songDetails.snippet.title;
                    song.duration = this.youtubeService.getSongDuration(songDetails);
                }
                break;
            }
        }
        return song;
    }

    public async addSong(url: string, username: string): Promise<Song> {
        try {
            let song = this.parseUrl(url);
            song = await this.getSongDetails(song);
            this.songQueue[song.id] = song;
            Logger.info(LogType.Song, `${song.source}:${song.sourceId} added to Song Queue`);
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

        throw new InvalidSongUrlError(`Unabled to parse url ${url}`);
    }

    public songPlayed(song: Song): void {
        this.songQueue[song.id].beenPlayed = true;
    }

    public removeSong(song: Song): void {
        delete this.songQueue[song.id];
    }
}

export default SongService;
