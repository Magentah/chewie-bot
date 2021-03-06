import { inject } from "inversify";
import { IUser, RequestSource } from "../../models/";
import { SongService, TwitchService, UserService, EventService } from "../../services";
import { UserLevelsRepository } from "../../database";
import { Command } from "../command";
import { BotContainer } from "../../inversify.config";

export class AddSongCommand extends Command {
    private songService: SongService;
    private twitchService: TwitchService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
        this.twitchService = BotContainer.get(TwitchService);
    }

    public async execute(channel: string, user: IUser, url: string) {
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
