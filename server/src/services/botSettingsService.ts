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

    public async getValue(key: BotSettings): Promise<string> {
        if (this.settingCache[key]) {
            return this.settingCache[key];
        }

        const result = (await this.botSettings.get(key))?.value ?? this.getDefaultValue(key);
        this.settingCache[key] = result;
        return result;
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
