import { Command } from "../command";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { SonglistRepository } from "../../database";

export default class RandomCommand extends Command {
    private songlist: SonglistRepository;

    constructor() {
        super();
        this.songlist = BotContainer.get(SonglistRepository);
    }

    public async executeInternal(channel: string, user: IUser, genre: string): Promise<void> {
        const song = await this.songlist.getRandom(genre);

        if (song) {
            this.twitchService.sendMessage(channel, `Song for ${user.username}: ${song.album} - ${song.title}`);
        } else {
            this.twitchService.sendMessage(channel, `Nothing found in songlist for "${genre}".`);
        }
    }
}
