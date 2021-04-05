import { inject, injectable } from "inversify";
import { EventLogType, IUser, RequestSource } from "../models";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import SongService from "./songService";
import { IBitsMessage, IDonationMessage, ISubscriptionMessage, SubscriptionPlan, SubType } from "./streamlabsService";
import TwitchService from "../services/twitchService";
import UserService from "../services/userService";
import * as Config from "../config.json";
import { PointLogType } from "../models/pointLog";

@injectable()
export default class RewardService {
    constructor(
        @inject(SongService) private songService: SongService,
        @inject(UserService) private userService: UserService,
        @inject(TwitchService) private twitchService: TwitchService,
        @inject(BotSettingsService) private settings: BotSettingsService
    ) {
        this.twitchService.setAddGiftCallback((username: string, recipient: string, giftedMonths: number, plan: string | undefined) =>
            this.processGiftSub(username, giftedMonths, plan)
        );
        this.twitchService.setSubMysteryGiftCallback((username: string, giftedSubs: number, plan: string | undefined) =>
            this.processGiftSub(username, giftedSubs, plan)
        );
    }

    public async processDonation(donation: IDonationMessage) {
        const user = await this.getUserForEvent(donation.from);

        this.addUserPoints(user, donation);
        this.addSongsToQueue(donation);
        this.addGoldStatus(user, donation);
    }

    public async processBits(bits: IBitsMessage) {
        const user = await this.getUserForEvent(bits.name);

        if (user) {
            const pointsPerBits = parseInt(await this.settings.getValue(BotSettings.PointsPerBit), 10);
            await this.userService.changeUserPoints(user, pointsPerBits * bits.amount, PointLogType.Bits);
        }
    }

    public async processSub(sub: ISubscriptionMessage) {
        const user = await this.getUserForEvent(sub.name);
        if (!user) {
            return;
        }

        // For initial subs, "months" should always be 1.
        // Unless when gifted, because multi-month gifts are possible.
        // For re-subs, months should be the total number of months so far.
        // For points, we can this always use "months".
        this.addSubUserPoints(user, sub.months);

        if (sub.sub_plan === SubscriptionPlan.Tier3) {
            if (sub.sub_type === SubType.Resub) {
                this.userService.addVipGoldWeeks(user, 2, "T3 Resub");
            } else {
                this.userService.addVipGoldWeeks(user, 2 * sub.months, "T3 sub");
            }
        }
    }

    public async processGiftSub(username: string, giftedMonths: number, plan: string | undefined) {
        if (plan === SubscriptionPlan.Tier3) {
            // Both gifter and receiver gets halb the amount of VIP gold.
            // We assume that the user on the receiving end will be covered by a streamlabs event.
            const giftingUser = await this.getUserForEvent(username);
            if (giftingUser) {
                this.userService.addVipGoldWeeks(giftingUser, giftedMonths, "Gifted T3 sub");
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

    private async addGoldStatus(user: IUser | undefined, donation: IDonationMessage) {
        const amountPerMonth = parseFloat(await this.settings.getValue(BotSettings.GoldStatusDonationAmount));
        const goldMonths = Math.floor(donation.amount / amountPerMonth);
        if (goldMonths > 0) {
            if (user) {
                this.userService.addVipGoldWeeks(user, goldMonths * 4, "Donation");
            }
        }
    }

    private async addUserPoints(user: IUser | undefined, donation: IDonationMessage) {
        if (user) {
            const pointsPerDollar = parseInt(await this.settings.getValue(BotSettings.DonationPointsPerDollar), 10);
            await this.userService.changeUserPoints(user, pointsPerDollar * donation.amount, PointLogType.Donation);
        }
    }

    private async addSubUserPoints(user: IUser | undefined, months: number) {
        if (user) {
            const pointsPerMonth = parseInt(await this.settings.getValue(BotSettings.SubPointsPerMonth), 10);
            await this.userService.changeUserPoints(user, pointsPerMonth * months, PointLogType.Sub);
        }
    }

    private async addSongsToQueue(donation: IDonationMessage) {
        const urlRegex: RegExp = /(https?:\/\/[^\s]+)/g;
        const amountRequired = parseFloat(await this.settings.getValue(BotSettings.SongRequestDonationAmount));

        if (donation.amount >= amountRequired) {
            const matches = urlRegex.exec(donation.message);
            if (matches) {
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
}
