import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IBotSettings } from "../models";

@injectable()
export default class BotSettingsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(): Promise<IBotSettings> {
        const databaseService = await this.databaseProvider();
        const botSettings = await databaseService.getQueryBuilder(DatabaseTables.BotSettings).first();
        return botSettings as IBotSettings;
    }

    public async addOrUpdate(settings: IBotSettings): Promise<void> {
        const existingSettings = await this.get();
        if (!existingSettings) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.BotSettings).insert(settings);
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.BotSettings).update(settings);
        }
    }

    public async delete(settings: IBotSettings | string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof settings === "string") {
            const toDelete = await this.get();
            if (toDelete) {
                await databaseService
                    .getQueryBuilder(DatabaseTables.BotSettings)
                    .delete()
                    .where({ username: toDelete.username });
                return true;
            }
        } else if (settings.username) {
            await databaseService
                .getQueryBuilder(DatabaseTables.BotSettings)
                .delete()
                .where({ username: settings.username });
            return true;
        }

        return false;
    }
}
