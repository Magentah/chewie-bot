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

    private getMonday(d: Date) : Date {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6:1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    public async executeInternal(channel: string, user: IUser, url: string) {
        // Check if user has gold status
        if (!user.vipExpiry) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, you need VIP gold status to request a song. Check !vipgold for details.`
            );
            return;
        }

        const todayDate = new Date(new Date().toDateString());

        // Check if gold status has expired (expiration date is inclusive).
        if (user.vipExpiry < todayDate) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, your VIP gold status expired on ${user.vipExpiry.toDateString()}.`
            );
            return;
        }

        // Check if gold song has been used this week.
        if (user.vipLastRequest) {
            const startOfWeek = this.getMonday(todayDate);
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
