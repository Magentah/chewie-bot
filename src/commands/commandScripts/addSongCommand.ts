import { Command } from '../command';
import { BotContainer } from '../../inversify.config';
import SongService from '../../services/songService';
import TwitchService from '../../services/twitchService';

export class AddSongCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, username: string,  url: string) {
        const song = await BotContainer.get(SongService).addSong(url, username);
        if (song) {
            BotContainer.get(TwitchService).sendMessage(channel, `${song.title} was added to the song queue by ${song.requestedBy}!`);
        }
    }
}

export default AddSongCommand;
