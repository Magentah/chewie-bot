import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import BotSettingsRepository from "../database/botSettings";
import { BotSettings } from "../services/botSettingsService";

@injectable()
class SettingsController {
    constructor(
        @inject(BotSettingsRepository) private settingsRepository: BotSettingsRepository,
    ) {
        Logger.info(LogType.ServerInfo, `SettingsController constructor. BotSettingsRepository exists: ${this.settingsRepository !== undefined}`);
    }

    /**
     * Get the value of a specific setting.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSetting(req: Request, res: Response): Promise<void> {
        if (!req.params.setting) {
            res.status(StatusCodes.OK);
            res.send("");
        } else {
            // Only allow certain settings to be accessible by the client code.
            switch (req.params.setting) {
                case BotSettings.FontCdnUrl:
                    const value = (await this.settingsRepository.get(req.params.setting))?.value;
                    res.status(StatusCodes.OK);
                    res.send(value);
                    break;
            }
        }
    }
}

export default SettingsController;
