import { inject, injectable } from "inversify";
import { IUser, RequestSource } from "../models";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import SongService from "./songService";
import { IBitsMessage, IDonationMessage, ISubscriptionMessage, SubscriptionPlan, SubType } from "./streamlabsService";
import TwitchService from "../services/twitchService";
import UserService from "../services/userService";
import * as Config from "../config.json";

@injectable()
export default class RewardService {
    private readonly DefaultGoldAmount: number = 50;
    private readonly DefaultDonationPointsPerDollar: number = 100;
    private readonly DefaultPointsPerBit: number = 1;
    private readonly DefaultSongRequestDonationAmount: number = 15;
    private readonly DefaultSubPointsPerMonth: number = 1000;

    constructor(@inject(SongService) private songService: SongService,
                @inject(UserService) private userService: UserService,
                @inject(TwitchService) private twitchService: TwitchService,
                @inject(BotSettingsService) private settings: BotSettingsService) {
        this.twitchService.setAddGiftCallback((username: string, recipient: string, giftedMonths: number, plan: string | undefined) => this.processGiftSub(username, giftedMonths, plan));
        this.twitchService.setSubMysteryGiftCallback((username: string, giftedSubs: number, plan: string | undefined) => this.processGiftSub(username, giftedSubs, plan));
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
            const pointsPerBits = parseInt(await this.settings.getValue(BotSettings.PointsPerBit, this.DefaultPointsPerBit.toString()), 10);
            await this.userService.changeUserPoints(user, pointsPerBits * bits.amount);
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
                this.userService.addVipGoldMonths(user, 0.5);
            } else {
                this.userService.addVipGoldMonths(user, 0.5 * sub.months);
            }
        }
    }

    public async processGiftSub(username: string, giftedMonths: number, plan: string | undefined) {
        if (plan === SubscriptionPlan.Tier3) {
            // Both gifter and receiver gets halb the amount of VIP gold.
            // We assume that the user on the receiving end will be covered by a streamlabs event.
            const giftingUser = await this.getUserForEvent(username);
            if (giftingUser) {
                this.userService.addVipGoldMonths(giftingUser, 0.25 * giftedMonths);
            }
        }
    }

    private async getUserForEvent(username: string) {
        let user = await this.userService.getUser(username);

        // Add user from Twitch chat as best effort (then we know that it is a valid user name at least).
        if (!user) {
            await this.twitchService.addUserFromChatList(Config.twitch.broadcasterName, username);
            user = await this.userService.getUser(username);
        }

        return user;
    }

    private async addGoldStatus(user: IUser | undefined, donation: IDonationMessage) {
        const amountPerMonth = parseFloat(await this.settings.getValue(BotSettings.GoldStatusDonationAmount, this.DefaultGoldAmount.toString()));
        const goldMonths = Math.floor(donation.amount / amountPerMonth);
        if (goldMonths > 0) {
            if (user) {
                this.userService.addVipGoldMonths(user, goldMonths);
            }
        }
    }

    private async addUserPoints(user: IUser | undefined, donation: IDonationMessage) {
        if (user) {
            const pointsPerDollar = parseInt(await this.settings.getValue(BotSettings.DonationPointsPerDollar, this.DefaultDonationPointsPerDollar.toString()), 10);
            await this.userService.changeUserPoints(user, pointsPerDollar * donation.amount);
        }
    }

    private async addSubUserPoints(user: IUser | undefined, months: number) {
        if (user) {
            const pointsPerMonth = parseInt(await this.settings.getValue(BotSettings.SubPointsPerMonth, this.DefaultSubPointsPerMonth.toString()), 10);
            await this.userService.changeUserPoints(user, pointsPerMonth * months);
        }
    }

    private async addSongsToQueue(donation: IDonationMessage) {
        const urlRegex: RegExp = /(https?:\/\/[^\s]+)/g;
        const amountRequired = parseFloat(await this.settings.getValue(BotSettings.SongRequestDonationAmount, this.DefaultSongRequestDonationAmount.toString()));

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
