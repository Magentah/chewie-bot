import { inject, injectable } from "inversify";
import TwitchEventService from "./twitchEventService";
import { EventTypes } from "../models";
import UserTaxHistoryRepository, { IDBUserTaxHistory } from "../database/userTaxHistoryRepository";
import UserTaxStreakRepository from "../database/userTaxStreakRepository";
import StreamActivityRepository from "../database/streamActivityRepository";

@injectable()
export default class TwitchChannelTaxEventService {
    constructor(
        @inject(TwitchEventService) private twitchEventService: TwitchEventService,
        @inject(UserTaxHistoryRepository) private userTaxHistoryRepository: UserTaxHistoryRepository,
        @inject(UserTaxStreakRepository) private userTaxStreakRepository: UserTaxStreakRepository,
        @inject(StreamActivityRepository) private streamActivityRepository: StreamActivityRepository
    ) {
        this.twitchEventService.subscribeToEvent(EventTypes.StreamOnline, this.streamOnline);
    }

    /**
     * Function that triggers when the StreamOnline Twitch Event is triggered.
     * Will go through all users who have paid tax since the last stream to increase their current streaks.
     * Will also go through all users who have not paid tax since the last stream to reset their current streaks.
     */
    private async streamOnline(): Promise<void> {
        const dateTimeOnline = new Date(Date.now());
        const lastOnlineEvent = await this.streamActivityRepository.getLatestForEvent(EventTypes.StreamOnline);
        let lastOnlineDate: Date | undefined;
        let usersNotPaidTax: IDBUserTaxHistory[] = [];
        let usersPaidTax: IDBUserTaxHistory[] = [];

        if (lastOnlineEvent) {
            lastOnlineDate = lastOnlineEvent.dateTimeTriggered;
        }

        if (lastOnlineDate) {
            // Get all users who have paid tax since the last time the stream was online and update their streak.
            usersPaidTax = await this.userTaxHistoryRepository.getSinceDate(lastOnlineDate);
            usersPaidTax.forEach(async (taxEvent) => {
                const currentStreakData = await this.userTaxStreakRepository.get(taxEvent.userId);
                if (currentStreakData) {
                    let longestStreak: number = currentStreakData.longestStreak;
                    if (currentStreakData.currentStreak + 1 > currentStreakData.longestStreak) {
                        longestStreak = currentStreakData.currentStreak + 1;
                    }
                    if (taxEvent.id) {
                        await this.userTaxStreakRepository.updateStreak(taxEvent.userId, taxEvent.id, currentStreakData.currentStreak + 1, longestStreak);
                    }
                }
            });
        } else {
            // Stream hasn't been online yet, so streaks still need to be setup.
            const usersPaidTax = await this.userTaxHistoryRepository.getAll();
            usersPaidTax.forEach(async (taxEvent) => {
                if (taxEvent.id) {
                    await this.userTaxStreakRepository.add(taxEvent.userId, taxEvent.id);
                }
            });
        }

        // Get all users who haven't paid tax since the last online date.
        const lastOnlineEvents = await this.streamActivityRepository.getLastEvents(EventTypes.StreamOnline, 2);
        if (lastOnlineEvents.length == 2) {
            usersNotPaidTax = await this.userTaxHistoryRepository.getUsersBetweenDates(
                lastOnlineEvents[0].dateTimeTriggered,
                lastOnlineEvents[1].dateTimeTriggered
            );
            usersNotPaidTax.filter((taxEvent) => {
                return !usersPaidTax.includes(taxEvent);
            });
        }

        // Update all users who have not paid tax since the last stream to set current streak to 0.
        usersNotPaidTax.forEach(async (taxEvent) => {
            const streakEvent = await this.userTaxStreakRepository.get(taxEvent.userId);
            if (streakEvent && taxEvent.id) {
                await this.userTaxStreakRepository.updateStreak(taxEvent.userId, taxEvent.id, 0, streakEvent.longestStreak);
            }
        });

        await this.streamActivityRepository.add(EventTypes.StreamOnline, dateTimeOnline);
    }
}
