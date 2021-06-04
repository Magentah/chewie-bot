import { inject, injectable } from "inversify";
import { AchievementType, IUser } from "../models";
import { BotSettings } from "./botSettingsService";
import BotSettingsService from "./botSettingsService";
import AchievementsRepository from "../database/achievementsRepository";
import Logger, { LogType } from "../logger";

@injectable()
export default class AchievementService {
    constructor(
        @inject(BotSettingsService) private settingsService: BotSettingsService,
        @inject(AchievementsRepository) private repository: AchievementsRepository,
    ) {
    }

    public async grantAchievements(user: IUser, type: AchievementType, currentAmount: number) {
        if (!currentAmount) {
            Logger.warn(LogType.Achievements, "grantAchievements called without amount");
            return;
        }

        // First, determine all achievements that can potentially be granted for a certain type.
        // Exclude seasonal achievements, because these will be granted at the end of a season.
        const achievements = await this.repository.getGlobalByType(type, user);
        if (achievements.length === 0) {
            return;
        }

        for (const achievement of achievements) {
            if (currentAmount >= achievement.amount) {
                await this.repository.grantAchievement(user, achievement);
            } else {
                // Achievements sorted by amount asc, so once we got beyond
                // our current amount we can stop.
                break;
            }
        }
    }
}
