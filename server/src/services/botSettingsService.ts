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
    SeasonEnd = "season-end",
    DailyTaxBitAmount = "daily-tax-bits",
    SongDonationLink = "song-donation-link",
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
        [BotSettings.SeasonEnd]: "",
        [BotSettings.DailyTaxBitAmount]: 0,
        [BotSettings.SongDonationLink]: "",
        [BotSettings.CardsRequiredForUpgrade]: 100,
    };

    constructor(@inject(BotSettingsRepository) private botSettings: BotSettingsRepository) {
        // Empty
    }

    public async getValue(key: BotSettings): Promise<string> {
        return (await this.botSettings.get(key))?.value ?? this.getDefaultValue(key);
    }

    public getDefaultValue(key: BotSettings): string | number | boolean {
        return this.SettingDefaults[key];
    }

    public async getSettings(key: BotSettings): Promise<IBotSettings> {
        return await this.botSettings.get(key);
    }

    public async addOrUpdateSettings(settings: IBotSettings): Promise<void> {
        await this.botSettings.addOrUpdate(settings);
    }
    public async deleteSettings(settings: IBotSettings | string): Promise<void> {
        await this.botSettings.delete(settings);
    }
}
