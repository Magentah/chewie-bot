import { Request, Response } from "express";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from "http-status-codes";
import { inject } from "inversify";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SongService } from "../services";

class SongController {
    constructor(@inject(SongService) private songService: SongService) {
        Logger.info(
            LogType.ServerInfo,
            `SongController constructor. SongService exists: ${this.songService !== undefined}`
        );
    }

    /**
     * Get the list of song requests.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public getSongRequests(req: Request, res: Response): void {
        const songs = this.songService.getSongQueue();
        res.status(OK);
        res.send(songs);
    }

    /**
     * Get the list of songs for a single user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public getSongsForUser(req: Request, res: Response): void {
        const songs = this.songService.getSongsByUsername(req.params.username);
        res.status(OK);
        res.send(songs);
    }

    /**
     * Add a song request for a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addSongForUser(req: Request, res: Response): Promise<void> {
        if (req.body.url === undefined || req.body.url.length === 0) {
            res.status(BAD_REQUEST);
            res.send(APIHelper.error(BAD_REQUEST, "Request body does not include a valid URL."));
            return;
        }
        if (req.body.requestSource === undefined || req.body.requestSource.length === 0) {
            res.status(BAD_REQUEST);
            res.send(APIHelper.error(BAD_REQUEST, "Request body does not include a valid request source."));
            return;
        }
        const song = await this.songService.addSong(req.body.url, req.body.requestSource, req.params.username);

        if (song === undefined) {
            res.status(INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(INTERNAL_SERVER_ERROR, "There was an error when attempting to add the song request.")
            );
            return;
        }

        res.status(OK);
        res.send(song);
    }

    /**
     * Remove a song from the queue with a Song ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeSong(req: Request, res: Response): void {
        this.songService.removeSong(Number.parseInt(req.params.songId, 10));
        res.sendStatus(OK);
    }

    /**
     * Remove songs from the queue for a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeSongForUser(req: Request, res: Response): void {
        this.songService.removeSongForUser(req.params.username);
        res.sendStatus(OK);
    }
}

export default SongController;
