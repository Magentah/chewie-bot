import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { AchievementType, ISonglistCategory, ISonglistItem, IUser } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { SonglistRepository, UsersRepository } from "../database";
import { EventAggregator } from "../services";

@injectable()
class SonglistController {
    constructor(@inject(SonglistRepository) private songlistService: SonglistRepository,
                @inject(EventAggregator) private eventAggregator: EventAggregator,
                @inject(UsersRepository) private usersRepository: UsersRepository) {
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
        const sessionUser = req.user as IUser;
        const songs = await this.songlistService.getList(sessionUser?.id);
        res.status(StatusCodes.OK);
        res.send(songs.map(x => ({...x, songTags: typeof(x.songTags) === "string" ? x.songTags?.split(";") ?? [] : x.songTags})));
    }

    /**
     * Gets all songlist categories.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSonglistCategories(req: Request, res: Response): Promise<void> {
        const categories = await this.songlistService.getCategories();
        res.status(StatusCodes.OK);
        res.send(categories);
    }

    /**
     * Gets all songlist tags.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSonglistTags(req: Request, res: Response): Promise<void> {
        const tags = await this.songlistService.getTags();
        res.status(StatusCodes.OK);
        res.send(tags);
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
            await this.songlistService.update({
                id: newSong.id,
                album: newSong.album,
                artist: newSong.artist,
                categoryId: newSong.categoryId,
                title: newSong.title,
                attributedUserId: newSong.attributedUserId ?? null,
                songTags: newSong.songTags
            });

            if (newSong.attributedUserId) {
                const user = (await this.usersRepository.getByIds([newSong.attributedUserId]))[0];
                if (user) {
                    const count = await this.songlistService.countAttributions(newSong.attributedUserId);
                    const msg = { user, count, type: AchievementType.Songlist };
                    this.eventAggregator.publishAchievement(msg);
                }
            }

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
            const result = await this.songlistService.add({
                album: newSong.album,
                artist: newSong.artist,
                categoryId: newSong.categoryId,
                title: newSong.title,
                songTags: newSong.songTags
            });
            res.status(StatusCodes.OK);
            res.send(result);
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
     * Adds a category for the song list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addCategory(req: Request, res: Response): Promise<void> {
        const newCategory = req.body as ISonglistCategory;
        if (!newCategory) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a category object."));
            return;
        }

        try {
            const result = await this.songlistService.addCategory(newCategory);
            res.status(StatusCodes.OK);
            res.send(result);
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
     * Update a category for the song list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateCategory(req: Request, res: Response): Promise<void> {
        const category = req.body as ISonglistCategory;
        if (!category) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a category object."));
            return;
        }

        try {
            await this.songlistService.updateCategory({id: category.id, name: category.name, sortOrder: category.sortOrder});
            res.sendStatus(StatusCodes.OK);
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
     * Deletes a songlist category.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async deleteCategory(req: Request, res: Response): Promise<void> {
        const newCategory = req.body as ISonglistCategory;
        if (!newCategory) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a category object."));
            return;
        }

        try {
            await this.songlistService.deleteCategory(newCategory);
            res.sendStatus(StatusCodes.OK);
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
     * Updates the entire list of categories for the song list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateSonglistCategories(req: Request, res: Response): Promise<void> {
        const categories = req.body as ISonglistCategory[];
        if (!categories) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a category object."));
            return;
        }

        try {
            await this.songlistService.updateCategories(categories.map(x => ({id: x.id, name: x.name, sortOrder: x.sortOrder})));
            res.status(StatusCodes.OK);
            res.send(categories);
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

    /**
     * Adds a song to the user's personal favorites.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async markFavoriteSong(req: Request, res: Response): Promise<void> {
        const sessionUser = req.user as IUser;
        if (!sessionUser) {
            res.sendStatus(StatusCodes.FORBIDDEN);
            return;
        }

        const song = req.body as ISonglistItem;
        if (!song) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }

        try {
            await this.songlistService.markFavorite(sessionUser, song.id);
            res.sendStatus(StatusCodes.OK);
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
     * Removes a song from the user's personal favorites.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async unmarkFavoriteSong(req: Request, res: Response): Promise<void> {
        const sessionUser = req.user as IUser;
        if (!sessionUser) {
            res.sendStatus(StatusCodes.FORBIDDEN);
            return;
        }

        const song = req.body as ISonglistItem;
        if (!song) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a song object."));
            return;
        }

        try {
            await this.songlistService.unmarkFavorite(sessionUser, song.id);
            res.sendStatus(StatusCodes.OK);
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
}

export default SonglistController;
