import { inject, injectable } from "inversify";
import { AchievementType, IUser } from "../models";
import { BotSettings } from "./botSettingsService";
import BotSettingsService from "./botSettingsService";
import AchievementsRepository from "../database/achievementsRepository";
import Logger, { LogType } from "../logger";
import AchievementMessage from "../models/achievementMessage";
import TwitchService from "./twitchService";
import * as Config from "../config.json";
import EventAggregator, { EventChannel } from "./eventAggregator";

@injectable()
export default class AchievementService {
    constructor(
        @inject(BotSettingsService) private settingsService: BotSettingsService,
        @inject(AchievementsRepository) private repository: AchievementsRepository,
        @inject(TwitchService) private twitchService: TwitchService,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
    ) {
    }

    public setup() {
        const subscriber = this.eventAggregator.getSubscriber();
        subscriber.on("message", (channel: string, message: string) => {
            const msg: AchievementMessage = JSON.parse(message);
            this.grantAchievements(msg.user, msg.type, msg.count);
        });
        subscriber.subscribe(EventChannel.Achievements);
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

                // Send announcement message to chat.
                if (achievement.announcementMessage) {
                    let msg = achievement.announcementMessage;
                    msg = msg.replace(/\{user\}/ig, user.username);
                    msg = msg.replace(/\{amount\}/ig, achievement.amount.toString());
                    this.twitchService.sendMessage(Config.twitch.broadcasterName, msg);
                }
            } else {
                // Achievements sorted by amount asc, so once we got beyond
                // our current amount we can stop.
                break;
            }
        }
    }
}
