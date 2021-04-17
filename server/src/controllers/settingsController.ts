import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import BotSettingsRepository from "../database/botSettings";
import { APIHelper } from "../helpers";
import { IBotSettings } from "../models";
import BotSettingsService, { BotSettings } from "../services/botSettingsService";

@injectable()
class SettingsController {
    constructor(
        @inject(BotSettingsRepository) private settingsRepository: BotSettingsRepository,
        @inject(BotSettingsService) private settingsService: BotSettingsService,
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
            const storedSettings = await this.settingsRepository.getAll();
            const settings = [];

            for (const key of Object.values(BotSettings)) {
                settings.push(this.makeSetting(key as BotSettings, storedSettings));
            }

            res.status(StatusCodes.OK)
            res.send(settings);
        }  catch (err) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    public async updateSetting(req: Request, res: Response): Promise<void> {
        try {
            const setting = req.body as IBotSettings;
            if (!setting) {
                res.status(StatusCodes.BAD_REQUEST);
                res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a setting object."));
                return;
            }

            this.settingsService.addOrUpdateSettings({key: setting.key, value: setting.value});

            res.status(StatusCodes.OK)
            res.send(setting);
        }  catch (err) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    private makeSetting(key: BotSettings, storedSettings: IBotSettings[]): { key: BotSettings, value: string, description: string, readonly: boolean } {
        let description = "";

        // Indicates whether setting can be edited directly in the settings grid.
        let readonly = false;

        switch (key) {
            case BotSettings.DonationPointsPerDollar:
                description = "Donations: Points added per USD";
                break;

            case BotSettings.GoldStatusDonationAmount:
                description = "VIP Gold: USD required per month";
                break;

            case BotSettings.PointsPerBit:
                description = "Bits: Points added per Bit";
                break;

            case BotSettings.PruneLogsAfterDays:
                description = "Amount of days to retain logs";
                break;

            case BotSettings.RedeemCost:
                description = "Cost for !redeem command";
                break;

            case BotSettings.SongRequestDonationAmount:
                description = "USD required for song request";
                break;

            case BotSettings.SubPoints:
                description = "Points added per subscription";
                break;

            case BotSettings.SubPointsPerYear:
                description = "Points added per anniversary subscription and year";
                break;

            case BotSettings.BotUsername:
                description = "Bot user name";
                readonly = true;
                break;

            case BotSettings.BotUserAuth:
                description = "Bot OAuth token";
                readonly = true;
                break;
        }

        return {
            key,
            value: storedSettings.filter((item) => item.key === key )[0]?.value || this.settingsService.getDefaultValue(key),
            description,
            readonly
        };
    }
}

export default SettingsController;


