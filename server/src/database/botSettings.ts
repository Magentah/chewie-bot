import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IBotSettings } from "../models";

@injectable()
export default class BotSettingsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(key: string): Promise<IBotSettings> {
        const databaseService = await this.databaseProvider();
        const botSettings = await databaseService.getQueryBuilder(DatabaseTables.BotSettings).where({ key }).first();
        return botSettings as IBotSettings;
    }

    public async addOrUpdate(settings: IBotSettings): Promise<void> {
        const existingSettings = await this.get(settings.key);
        if (!existingSettings) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.BotSettings).insert(settings);
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.BotSettings).where({ key: settings.key }).update(settings);
        }
    }

    public async delete(settings: IBotSettings | string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof settings === "string") {
            const toDelete = await this.get(settings);
            if (toDelete) {
                await databaseService
                    .getQueryBuilder(DatabaseTables.BotSettings)
                    .delete()
                    .where({ key: toDelete.key });
                return true;
            }
        } else if (settings.key) {
            await databaseService
                .getQueryBuilder(DatabaseTables.BotSettings)
                .delete()
                .where({ key: settings.key });
            return true;
        }

        return false;
    }
}
