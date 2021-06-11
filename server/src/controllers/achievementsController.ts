import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IAchievement } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import AchievementsRepository from "../database/achievementsRepository";
import fs = require("fs");
import path = require("path");
import { Guid } from "guid-typescript";

@injectable()
class AchievementsController {
    readonly ImageDir: string = "images";

    constructor(@inject(AchievementsRepository) private achievementsRepository: AchievementsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `AchievementsController constructor. AchievementsRepository exists: ${this.achievementsRepository !== undefined}`
        );
    }

    /**
     * Get the full list of configured achievements.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getList(req: Request, res: Response): Promise<void> {
        const achievements = (await this.achievementsRepository.getList()).map(x => this.addUrl(x));
        res.status(StatusCodes.OK);
        res.send(achievements);
    }

    /**
     * Updates the details of an achievement.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateAchievement(req: Request, res: Response): Promise<void> {
        const achievement = req.body as IAchievement;
        if (!achievement) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include an achievement object."));
            return;
        }

        const achievementData = await this.achievementsRepository.get(achievement);
        if (!achievementData) {
            return;
        }

        try {
            await this.achievementsRepository.addOrUpdate({...achievementData,
                type: achievement.type,
                amount: achievement.amount,
                seasonal: achievement.seasonal,
                announcementMessage: achievement.announcementMessage
            });
            res.status(StatusCodes.OK);
            res.send(achievement);
        } catch (err) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the achievement."
                )
            );
        }
    }

    /**
     * Creates or updates an existing achievement and adds an image to it.
     * Receives data as multipart formdata.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async uploadImage(req: Request, res: Response): Promise<void> {
        const achievement = JSON.parse(req.body.achievement) as IAchievement;
        if (!achievement) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a achievement object."));
            return;
        }

        let achievementData = await this.achievementsRepository.get(achievement);
        if (!achievementData) {
            achievementData = await this.achievementsRepository.addOrUpdate({
                type: achievement.type,
                amount: achievement.amount,
                seasonal: achievement.seasonal,
                announcementMessage: achievement.announcementMessage,
                creationDate: new Date(),
                imageId: Guid.create().toString()
            });
        }

        const fileExt = this.achievementsRepository.getFileExt(req.files.image.mimetype);
        if (!fileExt) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Invalid mime type."));
            return;
        }

        try {
            if (req.files?.image) {
                const newachievement = {...achievementData, mimetype: req.files.image.mimetype};
                await this.achievementsRepository.addOrUpdate(newachievement);

                if (!fs.existsSync(this.ImageDir)) {
                    fs.mkdirSync(this.ImageDir);
                }

                // Delete old file
                if (achievementData.mimetype) {
                    const oldFileExt = this.achievementsRepository.getFileExt(achievementData.mimetype);
                    const oldFile = path.join(this.ImageDir, `${achievementData.imageId}.${oldFileExt}`);
                    if (fs.existsSync(oldFile)) {
                        fs.unlinkSync(oldFile);
                    }
                }

                const fstream = fs.createWriteStream(path.join(this.ImageDir, `${achievementData.imageId}.${fileExt}`));
                fstream.write(req.files.image.data);
                fstream.close();

                res.status(StatusCodes.OK);
                res.send(this.addUrl(newachievement));
            } else {
                res.sendStatus(StatusCodes.OK);
            }
        } catch (err) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the achievement."
                )
            );
        }
    }

    /**
     * Add an achievement.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addAchievement(req: Request, res: Response): Promise<void> {
        const newAchievement = req.body as IAchievement;
        if (!newAchievement) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a achievement object."));
            return;
        }

        try {
            const result = await this.achievementsRepository.addOrUpdate({
                type: newAchievement.type,
                amount: newAchievement.amount,
                seasonal: newAchievement.seasonal,
                announcementMessage: newAchievement.announcementMessage,
                creationDate: new Date(),
                imageId: Guid.create().toString()
            });
            res.status(StatusCodes.OK);
            res.send(result);
        } catch (err) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the achievement."
                )
            );
        }
    }

    /**
     * Remove an achievement by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async removeAchievement(req: Request, res: Response): Promise<void> {
        const achievement = req.body as IAchievement;
        if (achievement) {
            this.achievementsRepository.delete(achievement);
            if (achievement.mimetype) {
                const fileExt = this.achievementsRepository.getFileExt(achievement.mimetype);
                fs.unlinkSync(path.join(this.ImageDir, `${achievement.imageId}.${fileExt}`));
            }
        } else if (Number(req.body)) {
            const achievementData = await this.achievementsRepository.get(achievement);
            if (achievementData) {
                this.achievementsRepository.delete(achievementData);
                if (achievementData.mimetype) {
                    const fileExt = this.achievementsRepository.getFileExt(achievementData.mimetype);
                    fs.unlinkSync(path.join(this.ImageDir, `${achievementData.imageId}.${fileExt}`));
                }
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a achievement object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }

    private addUrl(x: IAchievement): any {
        return {...x, url: `/img/${x.imageId}.${this.achievementsRepository.getFileExt(x.mimetype ?? "")}` };
    }
}

export default AchievementsController;
