import { inject, injectable } from "inversify";
import { IDBUserTaxStreak } from "../models/taxHistory";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

@injectable()
export default class UserTaxStreakRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(userId: number): Promise<IDBUserTaxStreak | undefined> {
        const databaseService = await this.databaseProvider();
        const returnRewardEvent: IDBUserTaxStreak = await databaseService.getQueryBuilder(DatabaseTables.UserTaxStreak).select("*").where("userId", userId).first();
        return returnRewardEvent;
    }

    public async add(userId: number, taxRedemptionId: number): Promise<IDBUserTaxStreak> {
        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxStreak)
            .insert({ userId, lastTaxRedemptionId: taxRedemptionId, currentStreak: 1, longestStreak: 1 });
        const returnRewardEvent = await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxStreak)
            .join(DatabaseTables.UserTaxHistory, "userTaxHistory.id", "userTaxStreak.lastTaxRedemptionId")
            .first("*")
            .where("userTaxStreak.userId", userId);
        return returnRewardEvent as IDBUserTaxStreak;
    }

    public async updateStreak(userId: number, taxRedemptionId: number, currentStreak: number, longestStreak: number): Promise<void> {
        const databaseService = await this.databaseProvider();

        const currentUserStreak = await this.get(userId);
        if (!currentUserStreak) {
            await this.add(userId, taxRedemptionId);
            return;
        }

        await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxStreak)
            .update({ lastTaxRedemptionId: taxRedemptionId, currentStreak, longestStreak })
            .where("userId", userId);
    }

    public async reset() {
        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxStreak)
            .update({"currentStreak": 0, "longestStreak": 0});
    }
}
