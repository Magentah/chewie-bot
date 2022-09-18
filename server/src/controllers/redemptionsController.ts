import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ICommandRedemption } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import RedemptionsRepository from "../database/redemptionsRepository";
import fs = require("fs");
import path = require("path");
import { Guid } from "guid-typescript";

@injectable()
class RedemptionsController {
    readonly ImageDir: string = "images";

    constructor(@inject(RedemptionsRepository) private redemptionsRepository: RedemptionsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `RedemptionsController constructor. RedemptionsRepository exists: ${this.redemptionsRepository !== undefined}`
        );
    }

    /**
     * Get the full list of configured redemptions.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getList(req: Request, res: Response): Promise<void> {
        const redemptions = (await this.redemptionsRepository.getList()).map(x => this.addUrl(x));
        res.status(StatusCodes.OK);
        res.send(redemptions);
    }

    /**
     * Updates the details of an redemption.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateRedemption(req: Request, res: Response): Promise<void> {
        const redemption = req.body as ICommandRedemption;
        if (!redemption) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include an redemption object."));
            return;
        }

        const redemptionData = await this.redemptionsRepository.get(redemption);
        if (!redemptionData) {
            return;
        }

        try {
            await this.redemptionsRepository.addOrUpdate({...redemptionData,
                name: redemption.name,
                message: redemption.message
            });
            res.status(StatusCodes.OK);
            res.send(redemption);
        } catch (err: any) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the redemption."
                )
            );
        }
    }

    /**
     * Creates or updates an existing redemption and adds an image to it.
     * Receives data as multipart formdata.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async uploadImage(req: Request, res: Response): Promise<void> {
        const redemption = JSON.parse(req.body.redemption) as ICommandRedemption;
        if (!redemption) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a redemption object."));
            return;
        }

        let redemptionData = await this.redemptionsRepository.get(redemption);
        if (!redemptionData) {
            redemptionData = await this.redemptionsRepository.addOrUpdate({
                name: redemption.name,
                message: redemption.message,
                imageId: Guid.create().toString()
            });
        }

        const fileExt = this.redemptionsRepository.getFileExt(req.files.image.mimetype);
        if (!fileExt) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Invalid mime type."));
            return;
        }

        try {
            if (req.files?.image) {
                const newredemption = {...redemptionData, mimetype: req.files.image.mimetype};
                await this.redemptionsRepository.addOrUpdate(newredemption);

                if (!fs.existsSync(this.ImageDir)) {
                    fs.mkdirSync(this.ImageDir);
                }

                // Delete old file
                if (redemptionData.mimetype) {
                    const oldFileExt = this.redemptionsRepository.getFileExt(redemptionData.mimetype);
                    const oldFile = path.join(this.ImageDir, `${redemptionData.imageId}.${oldFileExt}`);
                    if (fs.existsSync(oldFile)) {
                        fs.unlinkSync(oldFile);
                    }
                }

                const fstream = fs.createWriteStream(path.join(this.ImageDir, `${redemptionData.imageId}.${fileExt}`));
                fstream.write(req.files.image.data);
                fstream.close();

                res.status(StatusCodes.OK);
                res.send(this.addUrl(newredemption));
            } else {
                res.sendStatus(StatusCodes.OK);
            }
        } catch (err: any) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the redemption."
                )
            );
        }
    }

    /**
     * Add an redemption.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addRedemption(req: Request, res: Response): Promise<void> {
        const newAchievement = req.body as ICommandRedemption;
        if (!newAchievement) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a redemption object."));
            return;
        }

        try {
            const result = await this.redemptionsRepository.addOrUpdate({
                name: newAchievement.name,
                message: newAchievement.message,
                imageId: Guid.create().toString()
            });
            res.status(StatusCodes.OK);
            res.send(result);
        } catch (err: any) {
            Logger.err(LogType.Achievements, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the redemption."
                )
            );
        }
    }

    /**
     * Remove an redemption by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async removeRedemption(req: Request, res: Response): Promise<void> {
        const redemption = req.body as ICommandRedemption;
        if (redemption) {
            await this.redemptionsRepository.delete(redemption);
            if (redemption.mimetype) {
                const fileExt = this.redemptionsRepository.getFileExt(redemption.mimetype);
                const imagePath = path.join(this.ImageDir, `${redemption.imageId}.${fileExt}`);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        } else if (Number(req.body)) {
            const redemptionData = await this.redemptionsRepository.get(redemption);
            if (redemptionData) {
                await this.redemptionsRepository.delete(redemptionData);
                if (redemptionData.mimetype) {
                    const fileExt = this.redemptionsRepository.getFileExt(redemptionData.mimetype);
                    const imagePath = path.join(this.ImageDir, `${redemptionData.imageId}.${fileExt}`);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a redemption object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }

    private addUrl(x: { mimetype?: string, imageId: string }): any {
        return {...x, url: `/img/${x.imageId}.${this.redemptionsRepository.getFileExt(x.mimetype ?? "")}` };
    }
}

export default RedemptionsController;
