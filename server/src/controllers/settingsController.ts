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
    private readonly SettingDescriptions = {
        [BotSettings.DonationPointsPerDollar]: { title: "Donations: Points added per USD", readonly: false },
        [BotSettings.GoldStatusDonationAmount]: { title: "VIP Gold: USD required per month", readonly: false },
        [BotSettings.PointsPerBit]: { title: "Bits: Points added per Bit", readonly: false },
        [BotSettings.PruneLogsAfterDays]: { title: "Amount of days to retain logs", readonly: false },
        [BotSettings.RedeemCost]: { title: "Cost for !redeem command", readonly: false },
        [BotSettings.SongRequestDonationAmount]: { title: "USD required for song request", readonly: false },
        [BotSettings.SubPoints]: { title: "Points added per subscription", readonly: false },
        [BotSettings.SubPointsPerYear]: { title: "Points added per anniversary subscription and year", readonly: false },
        [BotSettings.BotUsername]: { title: "Bot user name", readonly: true },
        [BotSettings.BotUserAuth]: { title: "Bot OAuth token", readonly: true },
        [BotSettings.Timezone]: { title: "Timezone for !time", readonly: false },
        [BotSettings.CardRedeemCost]: { title: "Points required for redeeming cards", readonly: false },
        [BotSettings.CardRedeemPerWeek]: { title: "Number of cards which can be redeemed per week (0 = no limit)", readonly: false },
        [BotSettings.TaxEventIsEnabled]: {
            title: "Tax: If Tax is enabled, then tax history and streaks will be tracked when channel point rewards are redeemed.",
            readonly: false,
        },
    };

    constructor(
        @inject(BotSettingsRepository) private settingsRepository: BotSettingsRepository,
        @inject(BotSettingsService) private settingsService: BotSettingsService
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

            res.status(StatusCodes.OK);
            res.send(settings);
        } catch (err) {
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

            this.settingsService.addOrUpdateSettings({ key: setting.key, value: setting.value });

            res.status(StatusCodes.OK);
            res.send(setting);
        } catch (err) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    private makeSetting(key: BotSettings, storedSettings: IBotSettings[]): { key: BotSettings; value: string; description: string; readonly: boolean } {
        return {
            key,
            value: storedSettings.filter((item) => item.key === key)[0]?.value || this.settingsService.getDefaultValue(key).toString(),
            description: this.SettingDescriptions[key].title,
            // Indicates whether setting can be edited directly in the settings grid.
            readonly: this.SettingDescriptions[key].readonly,
        };
    }
}

export default SettingsController;
