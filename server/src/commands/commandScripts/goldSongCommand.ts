import { IUser } from "../../models/";
import { SongService } from "../../services";
import { Command } from "../command";
import { BotContainer } from "../../inversify.config";

export class GoldSongCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
    }

    public async executeInternal(channel: string, user: IUser, url: string, ...args: string[]) {
        try {
            const comments = args.join(" ");

            const song = await this.songService.addGoldSong(url, user, comments);
            if (typeof song === "string") {
                this.twitchService.sendMessage(channel, song);
            } else {
                this.twitchService.sendMessage(
                    channel,
                    `${song.details.title} was added to the song queue by ${song.requestedBy}!`
                );
            }
        } catch (err) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, your song could not be added to the queue (${err}).`
            );
        }
    }
}

export default GoldSongCommand;
