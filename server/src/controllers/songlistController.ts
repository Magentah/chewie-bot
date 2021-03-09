import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ISong, ISonglistItem } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SonglistRepository } from "../database";

@injectable()
class SonglistController {
    constructor(@inject(SonglistRepository) private songlistService: SonglistRepository) {
        Logger.info(
            LogType.ServerInfo,
            `SonglistController constructor. SonglistRepository exists: ${this.songlistService !== undefined}`
        );
    }

    /**
     * Get the full song list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSonglist(req: Request, res: Response): Promise<void> {
        const songs = await this.songlistService.getList();
        res.status(StatusCodes.OK);
        res.send(songs);
    }

    /**
     * Updates the details of a songlist title.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateSong(req: Request, res: Response): Promise<void> {
        const newSong = req.body as ISonglistItem;
        if (!newSong) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }
        
        try {
            await this.songlistService.update(newSong);
            res.status(StatusCodes.OK);
            res.send(newSong);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the song."
                )
            );
        }
    }

    /**
     * Add a song to the song list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addSong(req: Request, res: Response): Promise<void> {
        const newSong = req.body as ISonglistItem;
        if (!newSong) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }
        
        try {
            await this.songlistService.add(newSong);
            res.status(StatusCodes.OK);
            res.send(newSong);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the song."
                )
            );
        }
    }

    /**
     * Remove a song from the songlist by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeSong(req: Request, res: Response): void {
        const song = req.body as ISonglistItem;
        if (song) {
            this.songlistService.delete(song);
        } else if (Number(req.body)) {
            this.songlistService.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default SonglistController;
