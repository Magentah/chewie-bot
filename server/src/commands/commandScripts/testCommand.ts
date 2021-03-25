import { Command } from "../command";
import { TwitchService } from "../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export class TestCommand extends Command {
    constructor() {
        super();
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public executeInternal(channel: string, user: IUser): void {
        this.twitchService.sendMessage(channel, "Test message from a command!");
    }
}

export default TestCommand;
