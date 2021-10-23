import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ISeason } from "../models";

@injectable()
export default class SeasonsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getCurrentSeason(): Promise<ISeason> {
        const databaseService = await this.databaseProvider();
        const endDate = new Date(new Date().toDateString());
        const lastSeason = await databaseService.getQueryBuilder(DatabaseTables.Seasons).whereNull("endDate").orderBy("startDate", "desc").first() as ISeason;
        if (lastSeason) {
            lastSeason.endDate = endDate;
            return lastSeason;
        } else {
            return { id: 0, startDate: new Date(0), endDate };
        }
    }

    public async getAll(): Promise<ISeason[]> {
        const databaseService = await this.databaseProvider();
        const seasons = await databaseService.getQueryBuilder(DatabaseTables.Seasons).select();
        return seasons as ISeason[];
    }

    public async get(season: ISeason): Promise<ISeason | undefined> {
        if (!season.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.Seasons).where({ id: season.id }).first();
        return results as ISeason;
    }

    public async addSeason(plannedEndDate: string | undefined): Promise<{newSeasonId: number, lastSeasonId: number | undefined}> {
        // Find last season and end it.
        const databaseService = await this.databaseProvider();
        const lastSeason = await databaseService.getQueryBuilder(DatabaseTables.Seasons).whereNull("endDate").orderBy("startDate", "desc").first() as ISeason;

        const endDate = new Date(new Date().toDateString());
        if (lastSeason) {
            await databaseService.getQueryBuilder(DatabaseTables.Seasons).where("id", lastSeason.id).update("endDate", endDate);

            // Start date of next season should always be one day after the last season.
            endDate.setDate(endDate.getDate() + 1);
        }

        const result = await databaseService.getQueryBuilder(DatabaseTables.Seasons).insert({"startDate": endDate, plannedEndDate});

        // Return new season ID
        return { newSeasonId: result[0], lastSeasonId: lastSeason?.id };
    }

    public async updateSeason(season: ISeason): Promise<ISeason | undefined> {
        const existingSeason = await this.get(season);
        if (existingSeason) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.Seasons).where({ id: season.id }).update(season);
            return season;
        }

        return undefined;
    }
}
