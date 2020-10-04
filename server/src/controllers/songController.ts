import { inject } from "inversify";
import { SongService } from "../services";
import { Request, Response } from "express";
import { ISong } from "../models";

class SongController {
    constructor(@inject(SongService) private songService: SongService) {}

    public getSongRequests(req: Request, res: Response): ISong[] {
        const songs = this.songService.getSongs();
        return songs;
    }

    public getSongsForUser(req: Request, res: Response): ISong[] {
        const songs = this.songService.getSongsByUsername(req.params.username);
        return songs;
    }

    public async addSongForUser(req: Request, res: Response): Promise<ISong> {
        const song = await this.songService.addSong(req.body.url, req.params.username);
        return song;
    }
}

export default SongController;
