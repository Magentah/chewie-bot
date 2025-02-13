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
        [BotSettings.GoldStatusDonationAmount]: { title: "VIP Gold: USD required for 4 weeks / requests", readonly: false },
        [BotSettings.PointsPerBit]: { title: "Bits: Points added per Bit", readonly: false },
        [BotSettings.PruneLogsAfterDays]: { title: "Amount of days to retain logs", readonly: false },
        [BotSettings.RedeemCost]: { title: "Cost for !redeem command", readonly: false },
        [BotSettings.SongRequestDonationAmount]: { title: "USD required for song request", readonly: false },
        [BotSettings.SubPointsT1]: { title: "Points added per T1 subscription", readonly: false },
        [BotSettings.SubPointsT2]: { title: "Points added per T2 subscription", readonly: false },
        [BotSettings.SubPointsT3]: { title: "Points added per T3 subscription", readonly: false },
        [BotSettings.SubPointsPerYear]: { title: "Points added per anniversary subscription and year", readonly: false },
        [BotSettings.BotUsername]: { title: "Bot user name", readonly: true },
        [BotSettings.BotUserAuth]: { title: "Bot OAuth token", readonly: true },
        [BotSettings.Timezone]: { title: "Timezone for !time", readonly: false },
        [BotSettings.CardRedeemCost]: { title: "Points required for redeeming cards", readonly: false },
        [BotSettings.CardRedeemPerWeek]: { title: "Number of cards which can be redeemed per week (0 = no limit)", readonly: false },
        [BotSettings.CardRecyclePoints]: { title: "Points received for recycling a card", readonly: false },
        [BotSettings.DailyTaxBitAmount]: { title: "Amount of bits considered as daily tax", readonly: false },
        [BotSettings.SongDonationLink]: { title: "URL for donations on song queue page", readonly: false },
        [BotSettings.CardsRequiredForUpgrade]: { title: "Number of cards required for redeeming an upgrade", readonly: false },
        [BotSettings.CommandCooldownInSeconds]: { title: "Cooldown for regular text commands (in seconds)", readonly: false },
        [BotSettings.GoldWeeksPerT3Sub]: { title: "VIP Gold: Amount of weeks / requests per T3 sub", readonly: false },
        [BotSettings.ReadonlyMode]: { title: "Read-only mode for points", readonly: false },
        [BotSettings.MaxSongRequestRedemptionsInQueue]: { title: "Maximum number of song requests through channel rewards in queue", readonly: false },
        [BotSettings.SubNotificationProvider]: { title: "Provider for subscription notifications (Twitch|Streamlabs)", readonly: false },
        [BotSettings.TimeoutDuration]: { title: "Duration for channel point redemption timeouts", readonly: false },
        [BotSettings.SudokuDuration]: { title: "Duration for sudoku timeouts", readonly: false },
        [BotSettings.ModsSudokuExemption]: { title: "Exemption for mods from sudoku timeouts", readonly: false },
        [BotSettings.TaxTimeoutDuration]: { title: "Duration for tax evasion timeouts", readonly: false },
        [BotSettings.TaxTimeoutDurationForInsubordination]: { title: "Duration for tax evasion timeouts after insubordination", readonly: false },
        [BotSettings.TaxTimeoutIncrement]: { title: "Amount of seconds tax timeout increases each time", readonly: false },
        [BotSettings.TaxTimeoutMax]: { title: "Max duration for tax evasion timeouts", readonly: false },
        [BotSettings.OpenAiApiKey]: { title: "OpenAI API key", readonly: false },
        [BotSettings.OpenAiModel]: { title: "OpenAI default model", readonly: false },
        [BotSettings.MaxPointsTrading]: { title: "Maximum allowed points for trading cards", readonly: false },
        [BotSettings.TaxEvasionPenalty]: { title: "Amount of points for tax evasion penalty", readonly: false },
        [BotSettings.TaxInspectorExemptUsers]: { title: "Users exempt from tax inspector", readonly: false },
        [BotSettings.TaxEvasionPenaltyLeaderboardCount]: { title: "Number of top users from tax evasion leaderboard for penalty", readonly: false },
        [BotSettings.TaxEvasionCooldown]: { title: "Number of minutes that tax evaders are safe after penalty", readonly: false },
        [BotSettings.GoldStatusRequestLimit]: { title: "VIP Gold: Limit requests to 1 per week or stream (Week|Stream)", readonly: false },
        [BotSettings.GoldStatusPermanentRequests]: { title: "VIP Gold: Use permanent requests instead of time periods", readonly: false },
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
        } catch (err: any) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    /**
     * Gets value of a specific setting (only public information)
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSetting(req: Request, res: Response): Promise<void> {
        try {
            const setting = req.params.name;

            switch (setting) {
                case BotSettings.CardRedeemCost:
                case BotSettings.SongDonationLink:
                case BotSettings.ReadonlyMode:
                    const value = await this.settingsService.getValue(setting);
                    res.status(StatusCodes.OK);
                    res.send(value.toString());
                    break;

                default:
                    res.sendStatus(StatusCodes.FORBIDDEN);
                    break;
            }
        } catch (err: any) {
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
        } catch (err: any) {
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
