import { Command } from "../command";
import { BotContainer } from "../../inversify.config";
import SongService from "../../services/songService";
import TwitchService from "../../services/twitchService";
import { IUser } from "../../models/user";

export class AddSongCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, url: string) {
        const song = await BotContainer.get(SongService).addSong(url, user.username);
        if (song) {
            BotContainer.get(TwitchService).sendMessage(
                channel,
                `${song.title} was added to the song queue by ${song.requestedBy}!`
            );
        }
    }
}

export default AddSongCommand;
