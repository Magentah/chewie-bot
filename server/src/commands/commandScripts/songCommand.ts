import { Command } from "../command";
import { SongService } from "../../services";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";

export class SongCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
    }

    public executeInternal(channel: string, user: IUser): void {
        const songQueue = this.songService.getSongQueue();
        if (songQueue.length > 0) {
            this.twitchService.sendMessage(channel, `${songQueue[0].title} requested by ${songQueue[0].requestedBy}`);
        } else {
            this.twitchService.sendMessage(channel, "There is no song in the queue currently.");
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "currentsong", commandName: "song" }];
    }

    public getDescription(): string {
        return `Outputs the first song in the song queue and its requester in chat.`;
    }
}

export default SongCommand;
