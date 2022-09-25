import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { SonglistRepository } from "../../../database";
import { UserService } from "../../../services";

export default class SongStatsCommand extends Command {
    private songlist: SonglistRepository;
    private userService: UserService;

    constructor() {
        super();
        this.songlist = BotContainer.get(SonglistRepository);
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, ...args: string[]): Promise<void> {
        const searchSubject = args.join(" ");
        if (!searchSubject) {
            this.twitchService.sendMessage(channel, `${user.username}, you did not specify a search subject.`);
            return;
        }

        const songs = await this.songlist.getBySearchSubject(searchSubject);

        if (songs && songs.length > 0 && songs[0].id) {
            // General song info
            let info = `Song: ${songs[0].album ? songs[0].album : songs[0].artist} - ${songs[0].title}`;

            // Show date added (if available)
            if (songs[0].created) {
                const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
                info += `, added ${dateFormat.format(new Date(songs[0].created))}`;
            }

            // Determine which users favorited the song
            const favorites = await this.songlist.getFavorites(songs[0].id);
            if (favorites.length) {
                info += `, favorited ${favorites.length} times (by `;

                if (favorites.length > 3) {
                    info += favorites.slice(0, 3).map(x => x.username).join(", ");
                    info += ` and ${favorites.length - 3} more`;
                } else {
                    info += favorites.map(x => x.username).join(", ");
                }

                info += ")";
            } else {
                info += `, not yet anyone's favorite song`;
            }

            // Show who songlisted the song, if any
            if (songs[0].attributedUserId) {
                const userInfo = await this.userService.getUserById(songs[0].attributedUserId);
                if (userInfo) {
                    info += `, songlisted by ${userInfo?.username}`;
                }
            }

            this.twitchService.sendMessage(channel, info);
        } else {
            this.twitchService.sendMessage(channel, `Nothing found in songlist for "${searchSubject}".`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Outputs additional information about a specific song. Usage: !songStats <search subject>`;
    }
}
