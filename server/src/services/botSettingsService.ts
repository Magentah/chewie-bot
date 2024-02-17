import { injectable, inject } from "inversify";
import BotSettingsRepository from "../database/botSettings";
import { IBotSettings } from "../models";

export enum BotSettings {
    BotUsername = "bot-username",
    BotUserAuth = "bot-user-auth",
    DonationPointsPerDollar = "points-multiplier-donations",
    SongRequestDonationAmount = "song-request-donation-amount",
    GoldStatusDonationAmount = "gold-status-donation-amount",
    SubPointsT1 = "points-per-sub",
    SubPointsT2 = "points-per-sub-t2",
    SubPointsT3 = "points-per-sub-t3",
    SubPointsPerYear = "points-per-anniversarysub",
    PointsPerBit = "points-multiplier-bits",
    PruneLogsAfterDays = "prune-logs-after-days",
    RedeemCost = "redeem-cost",
    CardRedeemCost = "card-redeem-cost",
    CardRedeemPerWeek = "card-redeem-perweek",
    CardRecyclePoints = "card-recycle-points",
    CardsRequiredForUpgrade = "card-count-upgrade",
    Timezone = "timezone",
    DailyTaxBitAmount = "daily-tax-bits",
    SongDonationLink = "song-donation-link",
    CommandCooldownInSeconds = "command-timeout",
    GoldWeeksPerT3Sub = "gold-weeks-per-sub-t3",
    ReadonlyMode = "readonly-mode",
    MaxSongRequestRedemptionsInQueue = "max-songrequest-redemptions-in-queue",
    SubNotificationProvider = "sub-notification-provider",
    TimeoutDuration = "redeption-timeout-duration",
    ModsSudokuExemption = "mods-sudoku-exemption",
    SudokuDuration = "sudoku-duration",
    TaxTimeoutDuration = "tax-timeout-duration",
    TaxTimeoutIncrement = "tax-timeout-increment",
    TaxTimeoutMax = "tax-timeout-max",
    OpenAiApiKey = "openai-api-key",
    OpenAiModel = "openai-api-model",
    MaxPointsTrading = "max-points-trading",
    TaxEvasionPenalty = "tax-evasion-penalty",
}

@injectable()
export default class BotSettingsService {
    private readonly SettingDefaults = {
        [BotSettings.DonationPointsPerDollar]: 100,
        [BotSettings.GoldStatusDonationAmount]: 50,
        [BotSettings.PointsPerBit]: 1,
        [BotSettings.PruneLogsAfterDays]: 7 * 5,
        [BotSettings.RedeemCost]: 50,
        [BotSettings.SongRequestDonationAmount]: 15,
        [BotSettings.SubPointsT1]: 500,
        [BotSettings.SubPointsT2]: 1000,
        [BotSettings.SubPointsT3]: 2500,
        [BotSettings.SubPointsPerYear]: 1000,
        [BotSettings.BotUsername]: "",
        [BotSettings.BotUserAuth]: "",
        [BotSettings.Timezone]: "",
        [BotSettings.CardRedeemCost]: 1000,
        [BotSettings.CardRedeemPerWeek]: 10,
        [BotSettings.CardRecyclePoints]: 300,
        [BotSettings.DailyTaxBitAmount]: 0,
        [BotSettings.SongDonationLink]: "",
        [BotSettings.CardsRequiredForUpgrade]: 100,
        [BotSettings.CommandCooldownInSeconds]: 10,
        [BotSettings.GoldWeeksPerT3Sub]: 1,
        [BotSettings.ReadonlyMode]: 0,
        [BotSettings.MaxSongRequestRedemptionsInQueue]: 0,
        [BotSettings.SubNotificationProvider]: "Twitch",
        [BotSettings.TimeoutDuration]: 60 * 5,
        [BotSettings.ModsSudokuExemption]: false,
        [BotSettings.SudokuDuration]: 120,
        [BotSettings.TaxTimeoutDuration]: 60 * 5,
        [BotSettings.TaxTimeoutIncrement]: 60,
        [BotSettings.TaxTimeoutMax]: 60 * 15,
        [BotSettings.OpenAiApiKey]: "",
        [BotSettings.OpenAiModel]: "",
        [BotSettings.MaxPointsTrading]: 0,
        [BotSettings.TaxEvasionPenalty]: 10,
    };

    private readonly settingCache: { [name: string] : any; } = {};

    constructor(@inject(BotSettingsRepository) private botSettings: BotSettingsRepository) {
        // Empty
    }

    public async getBoolValue(key: BotSettings): Promise<boolean> {
        return await this.getValue(key) === "1";
    }

    public async getIntValue(key: BotSettings): Promise<number> {
        return parseInt(await this.getValue(key), 10);
    }

    public async getTaxEvasionPenalty(evasionCount: number) {
        let penalty = await this.getIntValue(BotSettings.TaxTimeoutDuration);

        // Increase penalty each time if desired
        if (evasionCount > 0) {
            const penaltyIncrement = await this.getIntValue(BotSettings.TaxTimeoutIncrement);
            if (penaltyIncrement) {
                const penaltyMax = await this.getIntValue(BotSettings.TaxTimeoutMax);
                penalty = Math.min(penalty + penaltyIncrement * evasionCount, penaltyMax);
            }
        }

        return penalty;
    }

    public async getValue(key: BotSettings): Promise<string> {
        if (this.settingCache[key]) {
            return this.settingCache[key];
        }

        const result = (await this.botSettings.get(key))?.value ?? this.getDefaultValue(key);
        this.settingCache[key] = result;
        return result;
    }

    public async getSubNotificationProvider(): Promise<"Twitch" | "Streamlabs"> {
        return await this.getValue(BotSettings.SubNotificationProvider) === "Streamlabs" ? "Streamlabs" : "Twitch";
    }

    public getDefaultValue(key: BotSettings): string | number | boolean {
        return this.SettingDefaults[key];
    }

    public async getSettings(key: BotSettings): Promise<IBotSettings> {
        return await this.botSettings.get(key);
    }

    public async addOrUpdateSettings(settings: IBotSettings): Promise<void> {
        this.settingCache[settings.key] = settings.value;
        await this.botSettings.addOrUpdate(settings);
    }

    public async deleteSettings(settings: IBotSettings | string): Promise<void> {
        if (typeof settings === "string") {
            delete this.settingCache[settings];
        } else {
            delete this.settingCache[settings.key];
        }

        await this.botSettings.delete(settings);
    }
}
