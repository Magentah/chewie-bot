import { Request, Response } from "express";
import { OK } from "http-status-codes";
import { inject } from "inversify";
import { Logger, LogType } from "../logger";
import { SongService } from "../services";

class SongController {
    constructor(@inject(SongService) private songService: SongService) {
        Logger.info(
            LogType.ServerInfo,
            `SongController constructor. SongService exists: ${
                this.songService !== undefined
            }`
        );
    }

    public getSongRequests(req: Request, res: Response): void {
        const songs = this.songService.getSongQueue();
        res.status(OK);
        res.send(songs);
    }

    public getSongsForUser(req: Request, res: Response): void {
        const songs = this.songService.getSongsByUsername(req.params.username);
        res.status(OK);
        res.send(songs);
    }

    public async addSongForUser(req: Request, res: Response): Promise<void> {
        const song = await this.songService.addSong(
            req.body.url,
            req.params.username
        );
        res.status(OK);
        res.send(song);
    }

    public removeSong(req: Request, res: Response): void {
        this.songService.removeSong(Number.parseInt(req.params.songId, 10));
        res.sendStatus(OK);
    }

    public removeSongForUser(req: Request, res: Response): void {
        this.songService.removeSongForUser(req.params.username);
        res.sendStatus(OK);
    }
}

export default SongController;
