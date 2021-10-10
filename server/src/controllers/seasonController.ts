import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import SeasonsRepository from "../database/seasonsRepository";
import { APIHelper } from "../helpers";
import BotSettingsService from "../services/botSettingsService";

@injectable()
class SeasonController {
    constructor(
        @inject(SeasonsRepository) private seasonsRepository: SeasonsRepository,
        @inject(BotSettingsService) private settingsService: BotSettingsService
    ) {
        Logger.info(LogType.ServerInfo, `SeasonController constructor. SeasonsRepository exists: ${this.seasonsRepository !== undefined}`);
    }

    /**
     * Gets a list of all settings in the database.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSeasons(req: Request, res: Response): Promise<void> {
        try {
            const storedSettings = await this.seasonsRepository.getAll();

            res.status(StatusCodes.OK);
            res.send(storedSettings);
        } catch (err: any) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }
}

export default SeasonController;
