import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export default class EditCmdCommand extends Command {
    private textCommands: TextCommandsRepository;

    constructor() {
        super();

        this.textCommands = BotContainer.get(TextCommandsRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, commandName: string, ...args: string[]): Promise<void> {
        // Remove all preceding exclamation marks if present.
        if (commandName.startsWith("!")) {
            commandName = commandName.substr(1);
        }

        const command = await this.textCommands.get(commandName);
        if (command) {
            command.message = args.join(" ");
            await this.textCommands.update(command);
            await this.twitchService.sendMessage(channel, `!${commandName} has been updated!`);
        } else {
            this.twitchService.sendMessage(channel, `The command !${commandName} does not exist.` );
        }
    }

    public getDescription(): string {
        return `Edits a command that outputs the specified message. Usage: !editcmd <name> <message>`;
    }
}
