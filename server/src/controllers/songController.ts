import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ISong, IUser, UserLevels } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SongService } from "../services";

@injectable()
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
        res.status(StatusCodes.OK);
        res.send(songs);
    }

    /**
     * Get the list of songs for a single user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public getSongsForUser(req: Request, res: Response): void {
        const songs = this.songService.getSongsByUsername(req.params.username);
        res.status(StatusCodes.OK);
        res.send(songs);
    }

    /**
     * Add a song request for a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addSongForUser(req: Request, res: Response): Promise<void> {
      if (req.body.url === undefined || req.body.url.length === 0) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a valid URL."));
            return;
        }
        if (req.body.requestSource === undefined || req.body.requestSource.length === 0) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a valid request source."));
            return;
        }

        try {
            const song = await this.songService.addSong(req.body.url, req.body.requestSource, req.params.username);

            if (song === undefined) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR);
                res.send(
                    APIHelper.error(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        "There was an error when attempting to add the song request."
                    )
                );
                return;
            }

            res.status(StatusCodes.OK);
            res.send(song);
        } catch (err) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    /**
     * Remove a song from the queue with a Song ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeSong(req: Request, res: Response): void {
        const songIds = Array.from<ISong>(req.body.songs);
        songIds.forEach((song) => {
            this.songService.removeSong(song.id);
        });

        res.sendStatus(StatusCodes.OK);
    }

    /**
     * Push a song from the queue to the top.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
     public moveSongToTop(req: Request, res: Response): void {
        const songIds = Array.from<ISong>(req.body.songs);
        songIds.forEach((song) => {
            this.songService.moveSongToTop(song.id);
        });

        res.sendStatus(StatusCodes.OK);
    }
}

export default SongController;
