import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { AchievementType, IAchievement, IUser } from "../models";

@injectable()
export default class AchievementsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<IAchievement[]> {
        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.Achievements);
        return results as IAchievement[];
    }

    public async getUserAchievements(user: IUser): Promise<{achievementId: number, date: Date, expiredDate: Date, mimetype: string, imageId: string, type: AchievementType, amount: number, name: string}[]> {
        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.UserAchievements).where("userId", user.id)
            .join(DatabaseTables.Achievements, "achievements.id", "userAchievements.achievementId")
            .orderBy("type")
            .orderBy("amount")
            .select(["achievementId", "date", "expiredDate", "mimetype", "imageId", "type", "amount", "name"]);
        return results as {achievementId: number, date: Date, expiredDate: Date, mimetype: string, imageId: string, type: AchievementType, amount: number, name: string}[];
    }

    public async getGlobalByType(type: AchievementType, exlucdeExistingUser: IUser): Promise<IAchievement[]> {
        const databaseService = await this.databaseProvider();
        const queryBuilder = databaseService.getQueryBuilder(DatabaseTables.Achievements);
        const results = await queryBuilder
            .where({ seasonal: false, type })
            .whereNotExists(databaseService.getQueryBuilder(DatabaseTables.UserAchievements)
                .select("id").from(DatabaseTables.UserAchievements).where({ userId: exlucdeExistingUser.id }).andWhereRaw("userAchievements.achievementId = achievements.id")
            )
            .orderBy("amount");
        return results as IAchievement[];
    }

    public async get(achievement: IAchievement): Promise<IAchievement | undefined> {
        if (!achievement.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.Achievements).where({ id: achievement.id }).first();
        return results as IAchievement;
    }

    public async addOrUpdate(achievement: IAchievement): Promise<IAchievement> {
        const existingMessage = await this.get(achievement);
        if (!existingMessage) {
            const databaseService = await this.databaseProvider();
            const result = await databaseService.getQueryBuilder(DatabaseTables.Achievements).insert(achievement);
            achievement.id = result[0];
            return achievement;
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.Achievements).where({ id: achievement.id }).update(achievement);
            return achievement;
        }
    }

    public async delete(achievements: IAchievement): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (achievements.id) {
            await databaseService
                .getQueryBuilder(DatabaseTables.Achievements)
                .where({ id: achievements.id })
                .delete();
            return true;
        }

        return false;
    }

    public async grantAchievement(user: IUser, achievement: IAchievement) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.UserAchievements)
            .insert({ userId: user.id, achievementId: achievement.id, date: new Date().getTime() }).onConflict(["userId", "achievementId", "expiredDate"]).ignore()
    }

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
        }

        return undefined;
    }
}
