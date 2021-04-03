import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export default class AddCmdCommand extends Command {
    private textCommands: TextCommandsRepository;

    constructor() {
        super();

        this.textCommands = BotContainer.get(TextCommandsRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, commandName: string, message: string): Promise<void> {
        let command = await this.textCommands.get(commandName);
        if (!command) {
            // Remove all preceding exclamation marks if present.
            if (commandName.startsWith("!")) {
                commandName = commandName.substr(1);
            }

            command = {
                commandName,
                message,
            };

            await this.textCommands.add(command);
            await this.twitchService.sendMessage(channel, `!${commandName} has been added!`);
        } else {
            this.twitchService.sendMessage(channel, `The command !${commandName} already exists.` );
        }
    }
}
