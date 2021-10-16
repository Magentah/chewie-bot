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

    public async addSeason(): Promise<{newSeasonId: number, lastSeasonId: number | undefined}> {
        // Find last season and end it.
        const databaseService = await this.databaseProvider();
        const lastSeason = await databaseService.getQueryBuilder(DatabaseTables.Seasons).whereNull("endDate").orderBy("startDate", "desc").first() as ISeason;

        const endDate = new Date(new Date().toDateString());
        if (lastSeason) {
            await databaseService.getQueryBuilder(DatabaseTables.Seasons).where("id", lastSeason.id).update("endDate", endDate);
            
            // Start date of next season should always be one day after the last season.
            endDate.setDate(endDate.getDate() + 1);
        }

        const result = await databaseService.getQueryBuilder(DatabaseTables.Seasons).insert({"startDate": endDate});
        
        // Return new season ID
        return { newSeasonId: result[0], lastSeasonId: lastSeason?.id };
    }
}
