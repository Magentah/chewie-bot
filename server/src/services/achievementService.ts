import { inject, injectable } from "inversify";
import { AchievementType, EventTypes, IAchievement, IUser } from "../models";
import AchievementsRepository from "../database/achievementsRepository";
import StreamActivityRepository from "../database/streamActivityRepository";
import Logger, { LogType } from "../logger";
import AchievementMessage from "../models/achievementMessage";
import TwitchService from "./twitchService";
import * as Config from "../config.json";
import EventAggregator, { EventChannel } from "./eventAggregator";
import UserTaxHistoryRepository from "../database/userTaxHistoryRepository";
import UsersRepository from "../database/usersRepository";
import { TaxType } from "../models/taxHistory";
import { UserService } from ".";
import { PointLogType } from "../models/pointLog";

@injectable()
export default class AchievementService {
    constructor(
        @inject(UserService) private userService: UserService,
        @inject(AchievementsRepository) private repository: AchievementsRepository,
        @inject(StreamActivityRepository) private streamActivityRepository: StreamActivityRepository,
        @inject(UserTaxHistoryRepository) private userTaxHistoryRepository: UserTaxHistoryRepository,
        @inject(TwitchService) private twitchService: TwitchService,
        @inject(UsersRepository) private usersRepository: UsersRepository,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
    ) {
    }

    public setup() {
        const subscriber = this.eventAggregator.getSubscriber();
        subscriber.on("message", (channel: string, message: string) => {
            const msg: AchievementMessage = JSON.parse(message);
            this.grantAchievements(msg.user, msg.type, msg.count, msg.seasonalCount);
        });
        subscriber.subscribe(EventChannel.Achievements);
    }

    public async grantAchievements(user: IUser, type: AchievementType, currentAmount?: number, seasonalAmount?: number) {
        if (!currentAmount && !seasonalAmount) {
            Logger.warn(LogType.Achievements, "grantAchievements called without amount");
            return;
        }

        // First, determine all achievements that can potentially be granted for a certain type.
        // Exclude achievements with amount = number of streams in season, because these will be
        // granted at the end of a season.
        const achievements = await this.repository.getGlobalByType(type, user);
        if (achievements.length === 0) {
            return;
        }

        for (const achievement of achievements) {
            if (achievement.seasonal) {
                if (seasonalAmount && seasonalAmount >= achievement.amount) {
                    await this.grantAchievement(user, achievement);
                }
            } else {
                if (currentAmount && currentAmount >= achievement.amount) {
                    await this.grantAchievement(user, achievement);
                }
            }
        }
    }

    private async grantAchievement(user: IUser, achievement: IAchievement) {
        await this.repository.grantAchievement(user, achievement);

        // Send announcement message to chat.
        if (achievement.announcementMessage) {
            let msg = achievement.announcementMessage;
            msg = msg.replace(/\{user\}/ig, user.username);
            msg = msg.replace(/\{amount\}/ig, achievement.amount.toString());
            this.twitchService.sendMessage(Config.twitch.broadcasterName, msg);
        }
    }

    /**
     * Grant all achievements, that depend on the number of streams in the season.
     * @returns
     */
    public async grantSeasonEndAchievements(seasonId: number, dateFrom: Date, dateUntil: Date) {
        const achievements = await this.repository.getEndOfSeasonAchievements();
        if (achievements.length === 0) {
            return;
        }

        // Determine number of streams.
        const events = await this.streamActivityRepository.getForEvent(EventTypes.StreamOnline);
        let eventCount = 0;
        let lastEventDate;
        for (const e of events) {
            if (e.dateTimeTriggered >= dateFrom && e.dateTimeTriggered <= dateUntil) {
                const dateTriggered = new Date(e.dateTimeTriggered);
                if (lastEventDate) {
                    const hours = Math.abs(dateTriggered.getTime() - lastEventDate.getTime()) / (60 * 60 * 1000);
                    // Ignore streams in quick succession (stream restarts for example).
                    if (hours > 12) {
                        eventCount++;
                    }
                } else {
                    eventCount++;
                }

                lastEventDate = dateTriggered;
            }
        }

        // Expire existing achievements.
        for (const achievement of achievements) {
            this.repository.expire(achievement, seasonId, dateUntil);
        }

        if (eventCount === 0) {
            return;
        }

        // Grant achievements based on tax history. So far, only
        // two types of achievements are useful in combination with the stream count.
        for (const achievement of achievements) {
            switch (achievement.type) {
                case AchievementType.DailyTaxesPaid:
                    for (const tax of await this.userTaxHistoryRepository.getCountByUser(TaxType.ChannelPoints, dateFrom, dateUntil)) {
                        if (tax.taxCount >= eventCount) {
                            const user = await this.usersRepository.getById(tax.userId);
                            if (user) {
                                await this.grantAchievement(user, achievement);
                            }
                        }
                    }
                    break;

                case AchievementType.DailyBitTaxesPaid:
                    for (const tax of await this.userTaxHistoryRepository.getCountByUser(TaxType.Bits, dateFrom, dateUntil)) {
                        if (tax.taxCount >= eventCount) {
                            const user = await this.usersRepository.getById(tax.userId);
                            if (user) {
                                await this.grantAchievement(user, achievement);
                            }
                        }
                    }
                    break;
            }
        }
    }

    /**
     * Redeems an achievement for points. Regular achievements can only be redeemed once, sesonal achievements once each season.
     * @param user User who redeems
     * @param achievement Achievment to be redeemed (ID is userAchievement.id here)
     * @returns true if successfull
     */
    public async redeemAchievement(user: IUser, achievement: IAchievement): Promise<boolean> {
        if (await this.repository.redeemForPoints(user, achievement)) {
            await this.userService.changeUserPoints(user, achievement.pointRedemption, PointLogType.Achievement);
            return true;
        }

        return false;
    }
}
