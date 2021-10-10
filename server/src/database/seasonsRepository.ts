import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ISeason } from "../models";

@injectable()
export default class SeasonsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getAll(): Promise<ISeason[]> {
        const databaseService = await this.databaseProvider();
        const seasons = await databaseService.getQueryBuilder(DatabaseTables.Seasons).select();
        return seasons as ISeason[];
    }
}
