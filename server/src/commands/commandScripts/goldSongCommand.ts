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
        if (!url) {
            this.twitchService.sendMessage(channel, `${user.username}, please provide a URL for your song request.`);
            return;
        }

        try {
            const comments = args.join(" ");

            const song = await this.songService.addGoldSong(url, user, comments);
            if (typeof song === "string") {
                this.twitchService.sendMessage(channel, song);
            } else {
                this.twitchService.sendMessage(
                    channel,
                    `${song.title} was added to the song queue by ${song.requestedBy}!`
                );
            }
        } catch (err) {
            this.twitchService.sendMessage(
                channel,
                `${user.username}, your song could not be added to the queue (${err}).`
            );
        }
    }

    public getDescription(): string {
        return `Adds a song to the song queue if VIP gold status is active. Usage: !goldsong <url> [<comment>]`;
    }
}

export default GoldSongCommand;
