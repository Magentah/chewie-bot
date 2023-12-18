import { Command } from "../command";
import { CommandSettings, IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export default class EnableCommand extends Command {
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
            await this.commandSettings.addOrUpdate({ commandName: command.getName(), key: CommandSettings.Disabled, value: "0" });
            await this.twitchService.sendMessage(channel, `Enabled command \"${commandName}\".`);
        } else{
            await this.twitchService.sendMessage(channel, `Command \"${commandName}\" does not exist.`);
            return;
        }
    }

    public async getDescription(): Promise<string> {
        return "Enables a system command. Usage: !enable <command>";
    }
}
