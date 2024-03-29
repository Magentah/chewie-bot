import { Command } from "../../command";
import { SongService } from "../../../services";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export class SongCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const songQueue = this.songService.getSongQueue();
        if (songQueue.length > 0) {
            await this.twitchService.sendMessage(channel, `${songQueue[0].cleanTitle ? songQueue[0].cleanTitle : songQueue[0].title} requested by ${songQueue[0].requestedBy}`);
        } else {
            await this.twitchService.sendMessage(channel, "There is no song in the queue currently.");
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "currentsong", commandName: "song" }];
    }

    public async getDescription(): Promise<string> {
        return `Outputs the first song in the song queue and its requester in chat.`;
    }
}

export default SongCommand;
