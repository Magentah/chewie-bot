import { Command } from "../command";
import { CommandSettings, IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export default class DisableCommand extends Command {
    constructor() {
        super();
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, commandName: string): Promise<void> {
        if (!commandName) {
            await this.twitchService.sendMessage(channel, "Command name not specified.");
            return;
        }

        // Remove ! if it's at the start of the command.
        if (commandName[0] === "!") {
            commandName = commandName.substring(1);
        }

        // Get the command if it exists.
        const commandList = BotContainer.get<Map<string, Command>>("Commands");
        const command = commandList.get(commandName);
        if (command !== undefined) {

            // Prevent unintended consequences...
            if (command.getName() === "Disable" || command.getName() === "Enable") {
                await this.twitchService.sendMessage(channel, `Command \"${commandName}\" cannot be disabled.`);
                return;
            }

            await this.commandSettings.addOrUpdate({ commandName: command.getName(), key: CommandSettings.Disabled, value: "1" });
            await this.twitchService.sendMessage(channel, `Disabled command \"${commandName}\".`);
        } else{
            await this.twitchService.sendMessage(channel, `Command \"${commandName}\" does not exist.`);
            return;
        }
    }

    public async getDescription(): Promise<string> {
        return "Disables a system command. Usage: !disable <command>";
    }
}
