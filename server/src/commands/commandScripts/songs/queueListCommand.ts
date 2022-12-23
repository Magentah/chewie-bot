import { Command } from "../../command";
import { SongService } from "../../../services";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export default class QueueListCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
    }

    public async executeInternal(channel: string, user: IUser, numberOfUsers: number): Promise<void> {
        const songQueue = this.songService.getSongQueue();
        let result = "";
        const songCount = numberOfUsers && Number.isInteger(numberOfUsers) ? Math.min(10, numberOfUsers) : 3;

        let songsListed = 0;
        for (let i = 0; i < songQueue.length; i++) {
            if (result !== "") {
                result += ", "
            }

            result += `${i + 1}: ${songQueue[i].title}`;
            songsListed++;

            if (songsListed >= songCount) {
                break;
            }
        }

        if (result === "") {
            await this.twitchService.sendMessage(channel,  "There are no songs in the queue currently.");
        } else {
            await this.twitchService.sendMessage(channel, `Songs in the queue: ${result}`);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "ql", commandName: "QueueList" }];
    }

    public async getDescription(): Promise<string> {
        return `Outputs the current songs in the queue. Usage: !queuelist [<number of songs>]`;
    }
}
