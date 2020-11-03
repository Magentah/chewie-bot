import { BotContainer } from "../../inversify.config";
import { IUser, RequestSource } from "../../models/";
import { SongService, TwitchService } from "../../services";
import { Command } from "../command";

export class AddSongCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, url: string) {
        const song = await BotContainer.get(SongService).addSong(url, RequestSource.Chat, user.username);
        if (song) {
            BotContainer.get(TwitchService).sendMessage(
                channel,
                `${song.details.title} was added to the song queue by ${song.requestedBy}!`
            );
        }
    }
}

export default AddSongCommand;
