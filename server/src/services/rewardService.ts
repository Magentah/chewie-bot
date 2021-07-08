import { inject, injectable, LazyServiceIdentifer } from "inversify";
import { EventTypes, IUser, RequestSource } from "../models";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import SongService from "./songService";
import { IBitsMessage, IDonationMessage, ISubscriptionMessage, SubscriptionPlan, SubType } from "./streamlabsService";
import TwitchService from "../services/twitchService";
import UserService from "../services/userService";
import TaxService from "../services/taxService";
import * as Config from "../config.json";
import { PointLogType } from "../models/pointLog";
import TwitchEventService from "./twitchEventService";
import StreamActivityRepository from "../database/streamActivityRepository";
import UsersRepository from "../database/usersRepository";

@injectable()
export default class RewardService {
    constructor(
        @inject(SongService) private songService: SongService,
        @inject(UserService) private userService: UserService,
        @inject(UsersRepository) private usersRepository: UsersRepository,
        @inject(TwitchService) private twitchService: TwitchService,
        @inject(TaxService) private taxService: TaxService,
        @inject(BotSettingsService) private settings: BotSettingsService,
        @inject(StreamActivityRepository) private streamActivityRepository: StreamActivityRepository,
        @inject(new LazyServiceIdentifer(() => TwitchEventService)) private twitchEventService: TwitchEventService
    ) {
        this.twitchService.setAddGiftCallback((username: string, recipient: string, giftedMonths: number, plan: string | undefined) =>
            this.processGiftSub(username, giftedMonths, plan)
        );

        this.twitchEventService.subscribeToEvent(EventTypes.StreamOnline, () => this.extendGoldStatusForWeeksWithoutStream());
    }

    public async processDonation(donation: IDonationMessage) {
        const user = await this.getUserForEvent(donation.from);

        this.addUserPoints(user, donation);

        if ((await this.addGoldStatus(user, donation)) && user) {
            // Use goldsong for queue if possible
            const matches = this.getSongsForQueue(donation.message);
            for (const match of matches) {
                try {
                    await this.songService.addGoldSong(match, user);

                    // Only accept one song per donation.
                    break;
                } catch {
                    // Ignore any invalid songs
                    // Maybe consider URLs from unknown services in the future.
                }
            }
        } else {
            this.addSongsToQueue(donation);
        }
    }

    public async processBits(bits: IBitsMessage) {
        const user = await this.getUserForEvent(bits.name);

        if (user) {
            const pointsPerBits = parseInt(await this.settings.getValue(BotSettings.PointsPerBit), 10);
            if (pointsPerBits) {
                await this.userService.changeUserPoints(user, pointsPerBits * bits.amount, PointLogType.Bits);
            }

            const dailyTax = parseInt(await this.settings.getValue(BotSettings.DailyTaxBitAmount), 10);
            if (dailyTax > 0) {
                this.taxService.logDailyBitTax(user);
            }
        }
    }

    public async processSub(sub: ISubscriptionMessage) {
        const user = await this.getUserForEvent(sub.name);
        if (!user) {
            return;
        }

        // sub.months is always total months subbed ever. Use this number for giving anniversary bonus.
        // Other than that, this event will be called for each individual sub month.
        this.addSubUserPoints(user, sub.months, sub.sub_type === SubType.Resub ? PointLogType.Resub : PointLogType.Sub, sub.sub_plan, false);

        if (sub.sub_plan === SubscriptionPlan.Tier3) {
            this.userService.addVipGoldWeeks(user, 2, "T3 Resub");
        }
    }

    public async processGiftSub(username: string, giftedMonths: number, plan: string | undefined) {
        const giftingUser = await this.getUserForEvent(username);
        if (giftingUser) {
            this.addSubUserPoints(giftingUser, giftedMonths, PointLogType.GiftSubGiver, plan as SubscriptionPlan, true);

            if (plan === SubscriptionPlan.Tier3) {
                // Both gifter and receiver gets half the amount of VIP gold.
                // We assume that the user on the receiving end will be covered by a streamlabs event.
                if (giftingUser) {
                    this.userService.addVipGoldWeeks(giftingUser, giftedMonths, "Gifted T3 sub");
                }
            }
        }
    }

    private async getUserForEvent(username: string) {
        let user = await this.userService.getUser(username);

        // Add user from Twitch chat as best effort (then we know that it is a valid user name at least).
        if (!user) {
            if (await this.twitchService.userExistsInChat(Config.twitch.broadcasterName, username)) {
                user = await this.userService.addUser(username);
            }
        }

        return user;
    }

    private async addGoldStatus(user: IUser | undefined, donation: IDonationMessage): Promise<boolean> {
        const amountPerMonth = parseFloat(await this.settings.getValue(BotSettings.GoldStatusDonationAmount));
        const goldMonths = Math.floor(donation.amount / amountPerMonth);
        if (goldMonths > 0) {
            if (user) {
                await this.userService.addVipGoldWeeks(user, goldMonths * 4, "Donation");
                return true;
            }
        }

        return false;
    }

    private async addUserPoints(user: IUser | undefined, donation: IDonationMessage) {
        if (user) {
            const pointsPerDollar = parseInt(await this.settings.getValue(BotSettings.DonationPointsPerDollar), 10);
            await this.userService.changeUserPoints(user, pointsPerDollar * donation.amount, PointLogType.Donation);
        }
    }

    private async addSubUserPoints(user: IUser, totalMonthsSubbed: number, logType: PointLogType, plan: SubscriptionPlan, isSubGifter: boolean) {
        let pointsPerSub;
        switch (plan) {
            case SubscriptionPlan.Tier2:
                pointsPerSub = parseInt(await this.settings.getValue(BotSettings.SubPointsT2), 10);
                break;

            case SubscriptionPlan.Tier3:
                pointsPerSub = parseInt(await this.settings.getValue(BotSettings.SubPointsT3), 10);
                break;

            default:
                pointsPerSub = parseInt(await this.settings.getValue(BotSettings.SubPointsT1), 10);
                break;
        }

        if (isSubGifter) {
            // Gifter gets points for each month gifted in a multi month gift sub.
            await this.userService.changeUserPoints(user, pointsPerSub * totalMonthsSubbed, logType);
        } else {
            // Subscribers (even when gifted) get points for each sub and additional anniversary bonus.
            let totalPoints = pointsPerSub;
            // Consider anniversary
            if (totalMonthsSubbed % 12 === 0) {
                const pointsPerYear = parseInt(await this.settings.getValue(BotSettings.SubPointsPerYear), 10);
                totalPoints += (totalMonthsSubbed / 12) * pointsPerYear;
            }
            await this.userService.changeUserPoints(user, totalPoints, logType);
        }
    }

    /**
     * If there has not been a stream for an entire week or more,
     * extend gold status subscriptions for that period of time.
     */
    public async extendGoldStatusForWeeksWithoutStream() {
        // Gets the last 2 stream online events, as the last event is the one that was just triggred.
        const lastOnlineEvents = await this.streamActivityRepository.getLastEvents(EventTypes.StreamOnline, 2, "desc");
        const lastOnlineEvent = lastOnlineEvents?.length === 2 ? lastOnlineEvents[1] : lastOnlineEvents[0];
        if (lastOnlineEvent) {
            const oneDay = 24 * 60 * 60 * 1000;
            const nowDate = new Date(new Date().toDateString());
            const lastStreamDate = new Date(lastOnlineEvent.dateTimeTriggered);
            lastStreamDate.setHours(0, 0, 0, 0);

            // Calculate number of weeks without stream (= amount of VIP gold extension)
            const diffDays = Math.round(Math.abs((nowDate.getTime() - lastStreamDate.getTime()) / oneDay)) - 1;
            const weeksMissed = Math.floor(diffDays / 7);
            if (weeksMissed > 0) {
                // Find all users, whose VIP gold was active beyond last stream and extend
                const users = await this.usersRepository.getActiveVipGoldUsers(lastStreamDate);
                for (const user of users) {
                    await this.userService.addVipGoldWeeks(user, weeksMissed, "Stream offline");
                }
            }
        }
    }

    private getSongsForQueue(message: string): string[] {
        const urlRegex: RegExp = /(https?:\/\/[^\s]+)/g;
        return urlRegex.exec(message) ?? [];
    }

    private async addSongsToQueue(donation: IDonationMessage) {
        const amountRequired = parseFloat(await this.settings.getValue(BotSettings.SongRequestDonationAmount));

        if (donation.amount >= amountRequired) {
            const matches = this.getSongsForQueue(donation.message);
            for (const match of matches) {
                try {
                    await this.songService.addSong(match, RequestSource.Donation, donation.from);

                    // Only accept one song per donation.
                    return;
                } catch {
                    // Ignore any invalid songs
                    // Maybe consider URLs from unknown services in the future.
                }
            }
        }
    }
}
