import { IUser, RequestSource } from "../../models/";
import { SongService, TwitchService, UserService } from "../../services";
import { Command } from "../command";
import { BotContainer } from "../../inversify.config";

export class GoldSongCommand extends Command {
    private songService: SongService;
    private userService: UserService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
        this.userService = BotContainer.get(UserService);
    }

    private getDayStartingAtMonday(date: Date): number {
        const day = date.getDay();
        return day === 0 ? 6 : day -1;
    }

    /**
     * Determines the start of the week based on the individual VIP expiry date.
     * If VIP expires on Friday (inclusive), the next VIP week starts on Saturday.
     * @param dateToCheck Day when the request is being made (should be today)
     * @param vipExpiry Day when VIP expires
     * @returns Start of the current VIP week. Within result and dateToCheck, only one VIP request is allowed.
     */
    private getIndividualStartOfWeek(dateToCheck: Date, vipExpiry: Date) {
        // Make copy
        vipExpiry = new Date(vipExpiry);

        // Determine week start day based on VIP expiry (VIP weekday + 1)
        vipExpiry.setDate(vipExpiry.getDate() + 1);
        const vipWeekday = this.getDayStartingAtMonday(vipExpiry);

        const todayWeekday = this.getDayStartingAtMonday(dateToCheck);
        const dayDifference = todayWeekday - vipWeekday;
        const weekStartDay = new Date(new Date(dateToCheck).setDate(dateToCheck.getDate() - dayDifference));

        if (weekStartDay > dateToCheck)  {
            // Date for this weekday is in the future, use last week instead.
            weekStartDay.setDate(weekStartDay.getDate() - 7);
            return weekStartDay;
        } else {
            return weekStartDay;
        }
    }

    public async executeInternal(channel: string, user: IUser, url: string) {
        // Check if user has gold status
        if (!user.vipExpiry && !user.vipPermanentRequests) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, you need VIP gold status to request a song. Check !vipgold for details.`
            );
            return;
        }

        const todayDate = new Date(new Date().toDateString());

        // Check if gold status has expired (expiration date is inclusive).
        if (!user.vipPermanentRequests && user.vipExpiry) {
            if (user.vipExpiry < todayDate) {
                this.twitchService.sendMessage(
                    channel,
                    `${user.username}, your VIP gold status expired on ${user.vipExpiry.toDateString()}.`
                );
                return;
            }
        }

        // Check if gold song has been used this week.
        if (user.vipLastRequest && user.vipExpiry) {
            const startOfWeek = this.getIndividualStartOfWeek(todayDate, user.vipExpiry);
            if (user.vipLastRequest >= startOfWeek) {
                this.twitchService.sendMessage(
                    channel,
                    `Sorry ${user.username}, you already had a gold song request this week.`
                );
                return;
            }
        }

        try {
            const song = await this.songService.addSong(url, RequestSource.GoldSong, user.username);
            if (song) {
                user.vipLastRequest = todayDate;

                // Any gold song used will always reduce the amount of permanent requests left.
                // Adding a permanent request will also extend the VIP period, so no request will be lost.
                if (user.vipPermanentRequests) {
                    user.vipPermanentRequests--;
                }

                this.userService.updateUser(user);

                this.twitchService.sendMessage(
                    channel,
                    `${song.details.title} was added to the song queue by ${song.requestedBy}!`
                );
            }
        } catch (err) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, your song could not be added to the queue (${err}).`
            );
        }
    }
}

export default GoldSongCommand;
