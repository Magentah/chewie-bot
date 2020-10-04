import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models";

export class DelCmdCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, commandName: string): Promise<void> {
        const deleted = await BotContainer.get(TextCommandsRepository).delete(commandName);
        if (deleted) {
            await BotContainer.get(TwitchService).sendMessage(channel, `!${commandName} has been removed!`);
        }
    }
}

export default DelCmdCommand;
