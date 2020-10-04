import { Command } from "../command";
import { TwitchService } from "../../services";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models";

export class TestCommand extends Command {
    constructor() {
        super();
    }
    public execute(channel: string, user: IUser): void {
        BotContainer.get(TwitchService).sendMessage(channel, "Test message from a command!");
    }
}

export default TestCommand;
