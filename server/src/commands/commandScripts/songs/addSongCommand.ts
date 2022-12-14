import { IUser, RequestSource, UserLevels } from "../../../models";
import { SongService } from "../../../services";
import { Command } from "../../command";
import { BotContainer } from "../../../inversify.config";

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
            const song = await this.songService.addSong(url, RequestSource.Chat, forUser ? forUser : user.username, comments, "", "Added by " + user.username);
            if (song) {
                await this.twitchService.sendMessage(
                    channel,
                    `${song.title} was added to the song queue by ${song.requestedBy} at position ${this.songService.getSongQueue().indexOf(song) + 1}!`
                );
            }
        } catch (err) {
            await this.twitchService.sendMessage(
                channel,
                `${user.username}, the song could not be added to the queue (${err}).`
            );
        }
    }

    public async getDescription(): Promise<string> {
        return `Adds a new song to the song queue. Usage: !addsong <url> [<for user>] [<comment>]`;
    }
}

export default AddSongCommand;
