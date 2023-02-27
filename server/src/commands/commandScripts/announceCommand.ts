import { Command } from "../command";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";
import { CommandAliasesRepository, TextCommandsRepository } from "../../database";
import TextCommand from "./textCommand";

export class AnnounceCommand extends Command {
    private textCommands: TextCommandsRepository;
    private textCommand: TextCommand;
    private commandAliasRepository: CommandAliasesRepository;

    constructor() {
        super();
        this.textCommands = BotContainer.get(TextCommandsRepository);
        this.minimumUserLevel = UserLevels.Moderator;
        this.textCommand = new TextCommand();
        this.commandAliasRepository = BotContainer.get(CommandAliasesRepository);
    }

    public async executeInternal(channel: string, user: IUser, commandName: string, ...args: any[]): Promise<void> {
        // Remove ! if it's at the start of the command.
        if (commandName[0] === "!") {
            commandName = commandName.substring(1);
        }

        // If empty, just return
        if (!commandName) {
            return;
        }

        // If this is an alias, update the command name to be the actual command
        // so that we can get the description
        const commandNameIfAlias = await this.getAliasCommandName(commandName);
        if (commandNameIfAlias) {
            commandName = commandNameIfAlias;
        }

        const commandInfo = await this.textCommands.get(commandName);
        if (commandInfo) {
            const msg = await this.textCommand.getCommandText(user, commandName, [commandInfo.message, ...args]);
            if (msg) {
                await this.twitchService.announce(msg);
            }
        } else {
            await this.twitchService.sendMessage(channel, `The command "${commandName}" does not exist`);
        }
    }

    private async getAliasCommandName(command: string): Promise<string | undefined> {
        const aliases = await this.commandAliasRepository.getList();
        const alias = aliases.find((alias) => alias.alias === command);
        if (alias) {
            return alias.commandName;
        }
        return undefined;
    }

    public async getDescription(): Promise<string> {
        return "Executes a command but outputs the command text as announcement. Usage: !announce <command>";
    }
}

export default AnnounceCommand;
