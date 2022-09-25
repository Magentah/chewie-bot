import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { SonglistRepository } from "../../../database";

export default class TopFavoritesCommand extends Command {
    private songlistRepository: SonglistRepository;

    constructor() {
        super();
        this.songlistRepository = BotContainer.get(SonglistRepository);
    }

    public async executeInternal(channel: string, user: IUser, numberOfUsers: number): Promise<void> {
        const userCount = numberOfUsers && Number.isInteger(numberOfUsers) ? Math.min(25, numberOfUsers) : 10;

        const favorites = await this.songlistRepository.getTopFavorites(userCount);
        if (favorites.length === 0) {
            this.twitchService.sendMessage(channel, "No favorites defined.");
            return;
        }

        let result = "Top favorite songs: ";
        let counter = 1;
        for (const topSong of favorites) {
            result += `#${counter++} ${topSong.title} - ${topSong.artist} [${topSong.numFavorites}] / `
        }

        this.twitchService.sendMessage(channel, result.substring(0, result.length - 2));
    }

    public async getDescription(): Promise<string> {
        return `Displays the top 10 or <number> favorited songs on the songlist. Usage: !topFavorites [<number>]`;
    }
}
