import { IUser, RequestSource, UserLevels } from "../../models/";
import { SongService, TwitchService } from "../../services";
import { Command } from "../command";
import { BotContainer } from "../../inversify.config";

export class AddSongCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, url: string, forUser: string, ...args: string[]) {
        try {
            const comments = args.join(" ");
            const song = await this.songService.addSong(url, RequestSource.Chat, forUser ? forUser : user.username, comments);
            if (song) {
                this.twitchService.sendMessage(
                    channel,
                    `${song.title} was added to the song queue by ${song.requestedBy}!`
                );
            }
        } catch (err) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, the song could not be added to the queue (${err}).`
            );
        }
    }

    public getDescription(): string {
        return `Adds a new song to the song queue. Usage: !addsong <url> [<for user>] [<comment>]`;
    }
}

export default AddSongCommand;
