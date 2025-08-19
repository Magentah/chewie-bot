import { IUser, UserLevels } from "../../../models";
import { SongService } from "../../../services";
import { Command } from "../../command";
import { BotContainer } from "../../../inversify.config";

export class SongPlayedCommand extends Command {
    private songService: SongService;
    private static lastUsedTime = 0;
    private static readonly cooldownMs = 10000; // 10 seconds in milliseconds

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser) {
        const currentTime = Date.now();
        const timeSinceLastUse = currentTime - SongPlayedCommand.lastUsedTime;

        if (timeSinceLastUse < SongPlayedCommand.cooldownMs) {
            // Prevent accidential duplicate execution
            return;
        }

        const queue = this.songService.getSongQueue();
        if (queue.length === 0) {
            await this.twitchService.sendMessage(
                channel,
                `${user.username}, there are no songs in the queue.`
            );
            return;
        }

        SongPlayedCommand.lastUsedTime = currentTime;

        const firstSong = queue[0];
        await this.songService.songPlayed(firstSong);
        await this.twitchService.sendMessage(
            channel,
            `${user.username}, marked "${firstSong.title}" as played.`
        );
    }

    public getDescription(): Promise<string> {
        return Promise.resolve("Marks the first song in the queue as played and removes it. Usage: !songplayed");
    }
}

export default SongPlayedCommand;
