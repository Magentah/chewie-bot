import { inject, injectable } from "inversify";
import { IUser, RequestSource } from "../models";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import SongService from "./songService";
import { IDonationMessage } from "./streamlabsService";
import TwitchService from "./twitchService";
import UserService from "./userService";
import * as Config from "../config.json";

@injectable()
export default class DonationService {
    private readonly DefaultGoldAmount: number = 50;
    private readonly DefaultDonationPointsPerDollar: number = 100;
    private readonly DefaultSongRequestDonationAmount: number = 15;

    constructor(@inject(SongService) private songService: SongService,
                @inject(UserService) private userService: UserService,
                @inject(TwitchService) private twitchService: TwitchService,
                @inject(BotSettingsService) private settings: BotSettingsService) {
    }

    public async processDonation(donation: IDonationMessage) {
        // Only update user if we have a valid entry in our database. This
        // requires using the actual Twitch user name for the donation.
        let user = await this.userService.getUser(donation.from);

        // Add user from Twitch chat as best effort (then we know that it is a valid user name at least).
        if (!user) {
            await this.twitchService.addUserFromChatList(Config.twitch.broadcasterName, donation.from);
            user = await this.userService.getUser(donation.from);
        }

        this.addUserPoints(user, donation);
        this.addSongsToQueue(donation);
        this.addGoldStatus(user, donation);
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

    private async addSongsToQueue(donation: IDonationMessage) {
        const urlRegex: RegExp = /(https?:\/\/[^\s]+)/g;
        const amountPerSong = parseFloat(await this.settings.getValue(BotSettings.SongRequestDonationAmount, this.DefaultSongRequestDonationAmount.toString()));
        let amountLeft = donation.amount;

        const matches = urlRegex.exec(donation.message);
        if (matches) {
            for (const match of matches) {
                // Consider the possibility of multiple requests for a single donation
                if (amountLeft >= amountPerSong) {
                    try {
                        await this.songService.addSong(match, RequestSource.Donation, donation.from);
                        amountLeft -= amountPerSong;
                    } catch {
                        // Ignore any invalid songs
                        // TODO: Accept URLs from unknown services.
                    }
                }
            }
        }
    }
}