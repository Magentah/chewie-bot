import { inject, injectable } from "inversify";
import { RequestSource } from "../models";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import SongService from "./songService";
import { IDonationMessage } from "./streamlabsService";
import UserService from "./userService";

@injectable()
export default class DonationService {
    private readonly DefaultGoldAmount: number = 50;
    private readonly DefaultDonationPointsPerDollar: number = 100;
    private readonly DefaultSongRequestDonationAmount: number = 15;

    constructor(@inject(SongService) private songService: SongService,
                @inject(UserService) private userService: UserService,
                @inject(BotSettingsService) private settings: BotSettingsService) {
    }

    public processDonation(donation: IDonationMessage) {
        this.addUserPoints(donation);
        this.addSongsToQueue(donation);
        this.addGoldStatus(donation);
    }
    
    private async addGoldStatus(donation: IDonationMessage) {
        const amountPerMonth = parseFloat(await this.settings.getValue(BotSettings.GoldStatusDonationAmount, this.DefaultGoldAmount.toString()));
        const goldMonths = Math.floor(donation.amount / amountPerMonth);
        if (goldMonths > 0) {
            const user = await this.userService.getUser(donation.from);

            // Only update user if we have a valid entry in our database. This
            // requires using the actual Twitch user name for the donation.
            if (user) {
                this.userService.addVipGoldMonths(user, goldMonths);
            }
        }
    }

    private async addUserPoints(donation: IDonationMessage) {
        const user = await this.userService.getUser(donation.from);

        // Only update user if we have a valid entry in our database. This
        // requires using the actual Twitch user name for the donation.
        if (user) {
            const pointsPerDollar = parseInt(await this.settings.getValue(BotSettings.DonationPointsPerDollar, this.DefaultDonationPointsPerDollar.toString()), 10);
            await this.userService.changeUserPoints(user, pointsPerDollar * donation.amount);
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
