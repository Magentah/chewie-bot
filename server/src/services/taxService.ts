import { inject, injectable, LazyServiceIdentifer } from "inversify";
import { EventTypes, IEventSubNotification, IRewardRedemeptionEvent, ChannelPointRedemption, IChannelPointReward, AchievementType, IUser } from "../models";
import UserTaxHistoryRepository from "../database/userTaxHistoryRepository";
import UserTaxStreakRepository from "../database/userTaxStreakRepository";
import StreamActivityRepository, { IDBStreamActivity } from "../database/streamActivityRepository";
import TwitchChannelPointRewardService from "./channelPointRewardService";
import UserService from "./userService";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import TwitchEventService from "./twitchEventService";
import EventAggregator from "./eventAggregator";
import { IDBUserTaxHistory, TaxType } from "../models/taxHistory";
import { Logger, LogType } from "../logger";

@injectable()
export default class TaxService {
    constructor(
        @inject(UserService) private userService: UserService,
        @inject(UserTaxHistoryRepository) private userTaxHistoryRepository: UserTaxHistoryRepository,
        @inject(UserTaxStreakRepository) private userTaxStreakRepository: UserTaxStreakRepository,
        @inject(StreamActivityRepository) private streamActivityRepository: StreamActivityRepository,
        @inject(TwitchChannelPointRewardService) private channelPointRewardService: TwitchChannelPointRewardService,
        @inject(BotSettingsService) private botSettingsService: BotSettingsService,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
        @inject(new LazyServiceIdentifer(() => TwitchEventService)) private twitchEventService: TwitchEventService
    ) {
        this.twitchEventService.subscribeToEvent(EventTypes.StreamOnline, () => this.streamOnline());
        this.twitchEventService.subscribeToEvent(EventTypes.ChannelPointsRedeemed, (e: IEventSubNotification) => this.channelPointsRedeemed(e));
    }

    /**
     * Callback that is triggered when a channel point redemption event happens.
     * @param notification The channel point redemption notification.
     */
    private async channelPointsRedeemed(notification: IEventSubNotification): Promise<void> {
        Logger.info(LogType.TwitchEvents, `TaxService Channel Point Redemption`, notification);
        const taxChannelReward = await this.channelPointRewardService.getChannelRewardForRedemption(ChannelPointRedemption.Tax);

        Logger.info(
            LogType.TwitchEvents,
            `TaxChannelReward Title: ${taxChannelReward?.title} -- Notified Reward Title: ${(notification.event as IRewardRedemeptionEvent).reward.title}`
        );
        if (taxChannelReward && (notification.event as IRewardRedemeptionEvent).reward.title === taxChannelReward.title) {
            const user = await this.userService.getUser((notification.event as IRewardRedemeptionEvent).user_login);
            Logger.info(LogType.TwitchEvents, "User for reward redemption", user);
            if (user) {
                this.logDailyTax(user, (notification.event as IRewardRedemeptionEvent).reward.id);
            }
        }
    }

    public async logDailyTax(user: IUser, rewardId: string) {
        // Adds a tax redemption for the user.
        if (user.id) {
            await this.userTaxHistoryRepository.add(user.id, rewardId, TaxType.ChannelPoints);

            const count = await this.userTaxHistoryRepository.getCountForUser(user.id, TaxType.ChannelPoints);
            this.eventAggregator.publishAchievement({ user, type: AchievementType.DailyTaxesPaid, count });
        }
    }

    public async logDailyBitTax(user: IUser) {
        // Adds a tax redemption for the user.
        if (user.id) {
            await this.userTaxHistoryRepository.add(user.id, undefined, TaxType.Bits);

            const count = await this.userTaxHistoryRepository.getCountForUser(user.id, TaxType.Bits);
            this.eventAggregator.publishAchievement({ user, type: AchievementType.DailyBitTaxesPaid, count });
        }
    }

    /**
     * Function that triggers when the StreamOnline Twitch Event is triggered.
     * Will go through all users who have paid tax since the last stream to increase their current streaks.
     * Will also go through all users who have not paid tax since the last stream to reset their current streaks.
     */
    private async streamOnline(): Promise<void> {
        // Gets the last 2 streamOnline events. The first should be the one that just occured when this function is called,
        // The second should be the last stream online event.
        // If there's only 1, then this is the first stream.
        const lastOnlineEvents = await this.streamActivityRepository.getLastEvents(EventTypes.StreamOnline, 2, "desc");
        let lastOnlineEvent: IDBStreamActivity | undefined;
        if (lastOnlineEvents) {
            lastOnlineEvent = lastOnlineEvents.length === 2 ? lastOnlineEvents[1] : lastOnlineEvents[0];
        }

        // Ignore stream restarts (another stream within 6 hours since the last one).
        if (lastOnlineEvents.length === 2) {
            const sixHours = 6 * 60 * 60 * 1000;
            if (new Date(lastOnlineEvents[0].dateTimeTriggered).getTime() - new Date(lastOnlineEvents[1].dateTimeTriggered).getTime() < sixHours) {
                return;
            }
        }

        let lastOnlineDate: Date | undefined;
        if (lastOnlineEvent) {
            lastOnlineDate = lastOnlineEvent.dateTimeTriggered;
        }

        // TODO: Should probably have a way to do these updates in bulk rather than iterating through each user.
        // Last Online Date is the online time of the previous stream before the current one that is online.
        if (lastOnlineDate) {
            // Get all users who have paid tax since the last time the stream was online and update their streak.
            const usersPaidTax = await this.userTaxHistoryRepository.getSinceDate(lastOnlineDate);
            for (const taxEvent of usersPaidTax) {
                const currentStreakData = await this.userTaxStreakRepository.get(taxEvent.userId);
                if (currentStreakData) {
                    let longestStreak: number = currentStreakData.longestStreak;
                    if (currentStreakData.currentStreak + 1 > currentStreakData.longestStreak) {
                        longestStreak = currentStreakData.currentStreak + 1;
                    }
                    if (taxEvent.id) {
                        await this.userTaxStreakRepository.updateStreak(taxEvent.userId, taxEvent.id, currentStreakData.currentStreak + 1, longestStreak);
                    }
                } else if (taxEvent.id) {
                    await this.userTaxStreakRepository.add(taxEvent.userId, taxEvent.id);
                }
            };
        } else {
            // Stream hasn't been online yet, so streaks still need to be setup.
            const usersPaidTax = await this.userTaxHistoryRepository.getAll(TaxType.ChannelPoints);
            for (const taxEvent of usersPaidTax) {
                if (taxEvent.id) {
                    await this.userTaxStreakRepository.add(taxEvent.userId, taxEvent.id);
                }
            };
        }

        // Get all users who haven't paid tax since the last online date.
        if (lastOnlineEvents.length === 2) {
            const usersNotPaidTax = await this.userTaxHistoryRepository.getUsersNotPaidTax(
                lastOnlineEvents[1].dateTimeTriggered,
                lastOnlineEvents[0].dateTimeTriggered
            );

            // Update all users who have not paid tax since the last stream to set current streak to 0.
            for (const streakEvent of usersNotPaidTax) {
                await this.userTaxStreakRepository.updateStreak(streakEvent.userId, streakEvent.lastTaxRedemptionId, 0, streakEvent.longestStreak);
            };
        }
    }
}
