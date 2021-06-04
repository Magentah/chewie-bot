import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

export interface IDBUserTaxHistory {
    id?: number;
    userId: number;
    taxRedemptionDate: Date;
    channelPointRewardTwitchId: string;
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

    public async getCountForUser(userId: number): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.UserTaxHistory).count("id as cnt").where("userId", userId).first()).cnt;
        return count;
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

    public async getSinceDate(sinceDate: Date): Promise<IDBUserTaxHistory[]> {
        const databaseService = await this.databaseProvider();
        const returnUserTaxHistory: IDBUserTaxHistory[] = await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxHistory)
            .select("*")
            .where("taxRedemptionDate", ">=", sinceDate);
        return returnUserTaxHistory;
    }

    public async getUsersBetweenDates(fromDate: Date, toDate: Date): Promise<IDBUserTaxHistory[]> {
        const databaseService = await this.databaseProvider();
        const returnUserTaxHistory: IDBUserTaxHistory[] = await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxHistory)
            .select("*")
            .where("taxRedemptionDate", "<", toDate)
            .andWhere("taxRedemptionDate", ">=", fromDate)
            .distinct("userId");

        return returnUserTaxHistory;
    }

    public async getTopTaxpayers(rewardId: number, limit: number): Promise<{ userId: number, username: string, taxCount: number }[]> {
        const databaseService = await this.databaseProvider();

        const users = (await databaseService.getQueryBuilder(DatabaseTables.UserTaxHistory)
            .join(DatabaseTables.Users, "userTaxHistory.userId", "users.id")
            .groupBy("userTaxHistory.userId")
            .orderBy("taxCount", "desc")
            .where("channelPointRewardTwitchId", rewardId)
            .limit(limit)
            .select([
                "userTaxHistory.userId",
                "users.username",
                databaseService.raw("COUNT(userTaxHistory.id) AS taxCount"),
            ])) as { userId: number, username: string, taxCount: number }[];
        return users;
    }

    public async getLongestTaxStreaks(limit: number): Promise<{ userId: number, username: string, longestStreak: number }[]> {
        const databaseService = await this.databaseProvider();

        const users = (await databaseService.getQueryBuilder(DatabaseTables.UserTaxStreak)
            .join(DatabaseTables.Users, "userTaxStreak.userId", "users.id")
            .orderBy("longestStreak", "desc")
            .limit(limit)
            .select([
                "userTaxStreak.userId",
                "users.username",
                "longestStreak",
            ])) as { userId: number, username: string, longestStreak: number }[];
        return users;
    }

    public async getAll(): Promise<IDBUserTaxHistory[]> {
        const databaseService = await this.databaseProvider();
        const returnUserTaxHistory: IDBUserTaxHistory[] = await databaseService.getQueryBuilder(DatabaseTables.UserTaxHistory).select("*");
        return returnUserTaxHistory;
    }

    public async add(userId: number, channelPointRewardId: string): Promise<IDBUserTaxHistory> {
        const databaseService = await this.databaseProvider();
        const now = Date.now();
        await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxHistory)
            .insert({ userId, taxRedemptionDate: now, channelPointRewardTwitchId: channelPointRewardId });
        const returnRewardEvent = await databaseService
            .getQueryBuilder(DatabaseTables.UserTaxHistory)
            .select("*")
            .where("userId", userId)
            .andWhere("taxRedemptionDate", now);
        return returnRewardEvent as IDBUserTaxHistory;
    }
}
