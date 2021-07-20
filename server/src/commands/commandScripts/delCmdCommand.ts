import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export class DelCmdCommand extends Command {
    private textCommands: TextCommandsRepository;

    constructor() {
        super();

        this.textCommands = BotContainer.get(TextCommandsRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, commandName: string): Promise<void> {
        // Remove all preceding exclamation marks if present.
        if (commandName.startsWith("!")) {
            commandName = commandName.substr(1);
        }

        const deleted = await this.textCommands.delete(commandName);
        if (deleted) {
            await this.twitchService.sendMessage(channel, `!${commandName} has been removed!`);
        }
    }

    public getDescription(): string {
        return `Deletes a text command. Usage: !delcmd <name>`;
    }
}

export default DelCmdCommand;
