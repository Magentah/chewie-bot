import { Command } from "../../command";
import { SongService } from "../../../services";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export default class MyQueueCommand extends Command {
    private songService: SongService;

    constructor() {
        super();

        this.songService = BotContainer.get(SongService);
    }

    public executeInternal(channel: string, user: IUser, username: string): void {
        const songQueue = this.songService.getSongQueue();
        let result = "";

        const forUser = username ? username : user.username;

        for (let i = 0; i < songQueue.length; i++) {
            if (result !== "") {
                result += ", "
            }

            if (songQueue[i].requestedBy.toLowerCase() === forUser.toLowerCase()) {
                result += `${songQueue[i].title} at position ${i + 1}`;
            }
        }

        if (username) {
            if (result === "") {
                this.twitchService.sendMessage(channel,  `There are no songs for ${forUser} in the queue currently.`);
            } else {
                this.twitchService.sendMessage(channel, `Songs for ${forUser} in the queue: ${result}`);
            }
        } else {
            if (result === "") {
                this.twitchService.sendMessage(channel,  `${forUser}, you have no songs in the queue currently.`);
            } else {
                this.twitchService.sendMessage(channel, `${forUser}, your songs in the queue: ${result}`);
            }
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "mq", commandName: "MyQueue" }];
    }

    public getDescription(): string {
        return `Outputs a user's songs in the queue. Usage: !myQueue [<user>]`;
    }
}
