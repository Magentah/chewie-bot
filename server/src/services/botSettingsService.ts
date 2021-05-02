import { injectable, inject } from "inversify";
import BotSettingsRepository from "../database/botSettings";
import { IBotSettings } from "../models";

export enum BotSettings {
    BotUsername = "bot-username",
    BotUserAuth = "bot-user-auth",
    DonationPointsPerDollar = "points-multiplier-donations",
    SongRequestDonationAmount = "song-request-donation-amount",
    GoldStatusDonationAmount = "gold-status-donation-amount",
    SubPoints = "points-per-sub",
    SubPointsPerYear = "points-per-anniversarysub",
    PointsPerBit = "points-multiplier-bits",
    PruneLogsAfterDays = "prune-logs-after-days",
    RedeemCost = "redeem-cost",
}

@injectable()
export default class BotSettingsService {
    private readonly DefaultPruneDonationsAfterDays: number = 7 * 5;
    private readonly DefaultGoldAmount: number = 50;
    private readonly DefaultDonationPointsPerDollar: number = 100;
    private readonly DefaultPointsPerBit: number = 1;
    private readonly DefaultSongRequestDonationAmount: number = 15;
    private readonly DefaultSubPoints: number = 500;
    private readonly DefaultSubPointsPerYearMultiplier: number = 1000;
    private readonly DefaultRedeemCost: number = 50;

    constructor(@inject(BotSettingsRepository) private botSettings: BotSettingsRepository) {
        // Empty
    }

    public async getValue(key: BotSettings): Promise<string> {
        return (await this.botSettings.get(key))?.value ?? this.getDefaultValue(key);
    }

    public getDefaultValue(key: BotSettings): string {
        switch (key) {
            case BotSettings.PruneLogsAfterDays:
                return this.DefaultPruneDonationsAfterDays.toString();

            case BotSettings.GoldStatusDonationAmount:
                return this.DefaultGoldAmount.toString();

            case BotSettings.DonationPointsPerDollar:
                return this.DefaultDonationPointsPerDollar.toString();

            case BotSettings.PointsPerBit:
                return this.DefaultPointsPerBit.toString();

            case BotSettings.SongRequestDonationAmount:
                return this.DefaultSongRequestDonationAmount.toString();

            case BotSettings.SubPoints:
                return this.DefaultSubPoints.toString();

            case BotSettings.SubPointsPerYear:
                return this.DefaultSubPointsPerYearMultiplier.toString();

            case BotSettings.RedeemCost:
                return this.DefaultRedeemCost.toString();
        }

        return "";
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
