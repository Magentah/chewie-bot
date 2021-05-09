import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

interface IDBUserTaxHistory {
    id?: number;
    userId: number;
    taxRedemptionDate: Date;
}

@injectable()
export default class UserTaxHistoryRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getForUser(userId: number): Promise<IDBUserTaxHistory[]> {
        const databaseService = await this.databaseProvider();
        const returnRewardEvent: IDBUserTaxHistory[] = await databaseService.getQueryBuilder(DatabaseTables.UserTaxHistory).select("*").where("userId", userId);
        return returnRewardEvent;
    }

    public async getForUserSinceDate(userId: number, sinceDate: Date): Promise<IDBUserTaxHistory[]> {
        const databaseService = await this.databaseProvider();
        const returnUserTaxHistory: IDBUserTaxHistory[] = await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxHistory)
            .select("*")
            .where("userId", userId)
            .andWhere("taxRedemptionDate", ">=", sinceDate);
        return returnUserTaxHistory;
    }

    public async add(userId: number): Promise<IDBUserTaxHistory> {
        const databaseService = await this.databaseProvider();
        const now = Date.now();
        await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).insert({ userId, taxRedemptionDate: now });
        const returnRewardEvent = await databaseService
            .getQueryBuilder(DatabaseTables.RewardEvents)
            .select("*")
            .where("userId", userId)
            .andWhere("taxRedemptionDate", now);
        return returnRewardEvent as IDBUserTaxHistory;
    }
}
