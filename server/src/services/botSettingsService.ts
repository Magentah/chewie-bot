import { injectable, inject } from "inversify";
import BotSettingsRepository from "../database/botSettings";
import { IBotSettings } from "../models";

@injectable()
export default class BotSettingsService {
    constructor(@inject(BotSettingsRepository) private botSettings: BotSettingsRepository) {
        // Empty
    }

    public async getSettings(): Promise<IBotSettings> {
        return await this.botSettings.get();
    }

    public async addOrUpdateSettings(settings: IBotSettings): Promise<void> {
        await this.botSettings.addOrUpdate(settings);
    }
    public async deleteSettings(settings: IBotSettings | string): Promise<void> {
        await this.botSettings.delete(settings);
    }
}
