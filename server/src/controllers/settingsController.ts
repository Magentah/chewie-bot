import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import BotSettingsRepository from "../database/botSettings";
import { APIHelper } from "../helpers";

@injectable()
class SettingsController {
    constructor(
        @inject(BotSettingsRepository) private settingsRepository: BotSettingsRepository,
    ) {
        Logger.info(LogType.ServerInfo, `SettingsController constructor. BotSettingsRepository exists: ${this.settingsRepository !== undefined}`);
    }

    /**
     * Gets a list of all settings in the database.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSettings(req: Request, res: Response): Promise<void> {
        try {
            res.status(StatusCodes.OK)
            res.send(await this.settingsRepository.getAll());
        }  catch (err) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }
}

export default SettingsController;
