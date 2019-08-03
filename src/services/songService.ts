import { injectable } from 'inversify';
import Song from '../models/song';

@injectable()
export class SongService {
    private songQueue: { [key: string]: Song } = {};

    public addSong(song: Song): void {
        this.songQueue[song.id] = song;
    }

    public songPlayed(song: Song): void {
        this.songQueue[song.id].beenPlayed = true;
    }

    public removeSong(song: Song): void {
        delete this.songQueue[song.id];
    }
}

export default SongService;
