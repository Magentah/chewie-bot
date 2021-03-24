import { injectable, inject } from "inversify";
import BotSettingsRepository from "../database/botSettings";
import { IBotSettings } from "../models";

export enum BotSettings {
    BotUsername = "bot-username",
    BotUserAuth = "bot-user-auth",
    DonationPointsPerDollar = "points-multiplier-donations",
    SongRequestDonationAmount = "song-request-donation-amount",
    GoldStatusDonationAmount = "gold-status-donation-amount",
    SubPointsPerMonth = "points-multiplier-sub",
    PointsPerBit = "points-multiplier-bits",
}

@injectable()
export default class BotSettingsService {
    constructor(@inject(BotSettingsRepository) private botSettings: BotSettingsRepository) {
        // Empty
    }

    public async getValue(key: BotSettings, defaultValue: string): Promise<string> {
        return (await this.botSettings.get(key))?.value ?? defaultValue;
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
