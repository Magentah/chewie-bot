import { inject, injectable } from "inversify";
import { IDiscordSetting } from "../models";
import { DatabaseTables, DatabaseProvider } from "../services";

@injectable()
export default class DiscordRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(settingName: string): Promise<IDiscordSetting> {
        const databaseService = await this.databaseProvider();
        const discordSetting = await databaseService
            .getQueryBuilder(DatabaseTables.DiscordSettings)
            .first(`${DatabaseTables.DiscordSettings}.settingName`, "like", settingName);
        return discordSetting;
    }

    public async getAll(): Promise<IDiscordSetting[]> {
        const databaseService = await this.databaseProvider();
        const discordSettings = await databaseService.getQueryBuilder(DatabaseTables.DiscordSettings).select("*");
        return discordSettings;
    }

    public async add(discordSetting: IDiscordSetting): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.DiscordSettings).insert(discordSetting);
    }
}
