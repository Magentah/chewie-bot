import { Command } from "../command";
import { TwitchService } from "../../services";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";

export class TestCommand extends Command {
    private twitchService: TwitchService;
    constructor() {
        super();
        this.twitchService = BotContainer.get(TwitchService);
    }

    public execute(channel: string, user: IUser): void {
        this.twitchService.sendMessage(channel, "Test message from a command!");
    }
}

export default TestCommand;
