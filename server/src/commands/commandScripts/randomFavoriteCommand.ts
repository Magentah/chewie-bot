import { Command } from "../command";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { SonglistRepository } from "../../database";

export default class RandomFavoriteCommand extends Command {
    private songlist: SonglistRepository;

    constructor() {
        super();
        this.songlist = BotContainer.get(SonglistRepository);
    }

    public async executeInternal(channel: string, user: IUser, ...args: string[]): Promise<void> {
        const searchSubject = args.join(" ");
        const song = await this.songlist.getRandom(searchSubject, user);

        if (song) {
            this.twitchService.sendMessage(channel, `Song for ${user.username}: ${song.album ? song.album : song.artist} - ${song.title}`);
        } else {
            this.twitchService.sendMessage(channel, `No favorite found in songlist for "${searchSubject}".`);
        } else {
            this.twitchService.sendMessage(channel, `${user.username}, you have not specified any favorite songs yet.`);
        }
    }

    public getDescription(): string {
        return `Selects a random (of all / by genre / by search subject) favorite song from the song list and puts it into chat. Usage: !randomFavorite [<genre or search subject>]`;
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "randomfav", commandName: "randomFavorite" },
        ];
    }
}
