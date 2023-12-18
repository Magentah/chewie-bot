import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ICommandSettings } from "../models";

@injectable()
export default class CommandSettingsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(commandName: string, key: string): Promise<ICommandSettings> {
        const databaseService = await this.databaseProvider();
        return await databaseService.getQueryBuilder(DatabaseTables.CommandSettings).where({ key, commandName }).first() as ICommandSettings;
    }

    public async getValue(commandName: string, key: string): Promise<string | undefined> {
        const databaseService = await this.databaseProvider();
        const result = await databaseService.getQueryBuilder(DatabaseTables.CommandSettings).where({ key, commandName }).first() as ICommandSettings;
        return result === undefined ? undefined : result.value;
    }

    public async getAll(): Promise<ICommandSettings[]> {
        const databaseService = await this.databaseProvider();
        return await databaseService.getQueryBuilder(DatabaseTables.CommandSettings).select() as ICommandSettings[];
    }

    public async addOrUpdate(settings: ICommandSettings): Promise<void> {
        const existingSettings = await this.get(settings.commandName, settings.key);
        if (!existingSettings) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.CommandSettings).insert(settings);
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.CommandSettings).where({ commandName: settings.commandName, key: settings.key }).update(settings);
        }
    }

    public async delete(settings: ICommandSettings): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (settings.key && settings.commandName) {
            await databaseService
                .getQueryBuilder(DatabaseTables.CommandSettings)
                .delete()
                .where({ key: settings.key, commandName: settings.commandName });
            return true;
        }

        return false;
    }
}
