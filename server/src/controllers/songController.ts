import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { EventLogType, ISong, IUser, UserLevels } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SongService, UserService } from "../services";
import { EventLogsRepository } from "../database";

@injectable()
class SongController {
    constructor(@inject(SongService) private songService: SongService,
                @inject(EventLogsRepository) private eventLogsRepository: EventLogsRepository,
                @inject(UserService) private userService: UserService) {
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
    public async getSongRequests(req: Request, res: Response): Promise<void> {
        const songs = this.songService.getSongQueue();

        // Clear song comments if user is not moderator at least.
        let clearComments = true;
        const sessionUser = req.user as IUser;
        if (sessionUser) {
            const user = await this.userService.getUser(sessionUser.username);
            if (user?.userLevel && user.userLevel >= UserLevels.Moderator) {
                clearComments = false;
            }
        }

        res.status(StatusCodes.OK);

        if (clearComments) {
            res.send(songs.map(x => { return {...x, comments: ""} }));
        } else {
            res.send(songs);
        }
    }

    /**
     * Get the list of played song requests.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
     public async getSongHistory(req: Request, res: Response): Promise<void> {
        const events = await this.eventLogsRepository.getLast(EventLogType.SongPlayed, 10);
        const resultSongs = [];
        for (const event of events) {
            const eventData = JSON.parse(event.data);
            const song = eventData.song as ISong;
            if (song) {
                resultSongs.push(song);
            }
        }
        res.status(StatusCodes.OK);
        res.send(resultSongs);
    }

    /**
     * Searches within all previously requested songs.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async searchRequestHistory(req: Request, res: Response): Promise<void> {
        if (!req.query.search || typeof(req.query.search) !== "string") {
            res.status(StatusCodes.OK);
            res.send([]);
        } else {
            const songRequests = await this.eventLogsRepository.searchRequests(req.query.search, 10);
            const resultSongs = [];
            for (const event of songRequests) {
                const eventData = JSON.parse(event.data);
                const song = eventData.song;
                if (song) {
                    resultSongs.push({...song, requestTime: event.time});
                }
            }
            res.status(StatusCodes.OK);
            res.send(resultSongs);
        }
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
            const song = await this.songService.addSong(req.body.url, req.body.requestSource, req.params.username, "");

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
        } catch (err: any) {
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
     * Remove a song from the queue and adds it to the history.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
     public completeSong(req: Request, res: Response): void {
        const songIds = Array.from<ISong>(req.body.songs);
        songIds.forEach((song) => {
            this.songService.songPlayed(song.id);
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
