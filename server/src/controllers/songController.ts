import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { EventLogType, IEventLog, ISong, IUser, UserLevels } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SongService, UserService } from "../services";
import { EventLogsRepository } from "../database";
import { IArchivedSong } from "../models/song";
import moment = require("moment");

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
     * Transfers archived song data to a song object.
     * @param songData Archived song information (some data missing)
     * @param event Event log entry
     * @returns ISong object
     */
    private static convertFromArchive(songData: IArchivedSong, event: IEventLog): ISong {
        return {
            title: songData.title,
            duration: moment.duration(songData.duration),
            requestedBy: songData.requestedBy,
            requestSource: songData.requestSource,
            source: songData.songSource,
            sourceId: "",
            sourceUrl: songData.url,
            previewUrl: songData.previewUrl,
            comments: "",
            requestTime: new Date(event.time ?? 0).getTime()
        };
    }

    /**
     * Get the list of played song requests.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
     public async getSongHistory(req: Request, res: Response): Promise<void> {
        const events = await this.eventLogsRepository.getLast(EventLogType.SongPlayed, 20);
        const resultSongs = [];
        for (const event of events) {
            const eventData = JSON.parse(event.data);
            const songData = eventData.song as IArchivedSong;
            if (songData) {
                resultSongs.push(SongController.convertFromArchive(songData, event));
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
            res.send({count: 0, songs: []});
        } else {
            const songRequests = await this.eventLogsRepository.searchRequests(req.query.search, parseInt(req.query.limit as string, 10));
            const songRequestsTotal = await this.eventLogsRepository.searchRequestsCount(req.query.search);

            const resultSongs = [];
            for (const event of songRequests) {
                const eventData = JSON.parse(event.data);
                const song = eventData.song as IArchivedSong;
                if (song) {
                    resultSongs.push(SongController.convertFromArchive(song, event));
                }
            }

            res.status(StatusCodes.OK);
            res.send({count: songRequestsTotal, songs: resultSongs});
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
        const newSong = req.body as ISong;
        if (!newSong) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }

        if (!newSong.sourceUrl) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "No URL has been provided."));
            return;
        }

        if (!newSong.requestSource) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a valid request source."));
            return;
        }

        try {
            const song = await this.songService.addSong(newSong.sourceUrl, newSong.requestSource, newSong.requestedBy ?? req.params.username, newSong.comments);

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
            if (song.id) {
                this.songService.removeSong(song.id);
            }
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
            if (song.id) {
                this.songService.songPlayed(song.id);
            }
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
            if (song.id) {
                this.songService.moveSongToTop(song.id);
            }
        });

        res.sendStatus(StatusCodes.OK);
    }

    /**
     * Changes the details of a song.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public editSong(req: Request, res: Response): void {
        const newSong = req.body as ISong;
        if (!newSong) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }

        this.songService.updateSong(newSong);
        res.sendStatus(StatusCodes.OK);
    }
}

export default SongController;
