import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IAchievement } from "../models";

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

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
        }

        return undefined;
    }
}
