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

    public async executeInternal(channel: string, user: IUser, url: string) {
        const song = await this.songService.addSong(url, RequestSource.Chat, user.username);
        if (song) {
            this.twitchService.sendMessage(
                channel,
                `${song.details.title} was added to the song queue by ${song.requestedBy}!`
            );
        }
    }
}

export default AddSongCommand;
