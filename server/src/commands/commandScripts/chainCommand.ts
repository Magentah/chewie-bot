import { ITextCommand, IUser, TextCommandMessagType } from "../../models";
import { BotContainer } from "../../inversify.config";
import { CommandAliasesRepository, TextCommandsRepository } from "../../database";
import TextCommand from "./textCommand";
import { Command } from "../command";

export default class ChainCommand extends TextCommand {
    private textCommands: TextCommandsRepository;
    private textCommand: TextCommand;
    private commandAliasRepository: CommandAliasesRepository;

    constructor() {
        super();

        this.isInternalCommand = false;
        this.textCommands = BotContainer.get(TextCommandsRepository);
        this.textCommand = new TextCommand();
        this.commandAliasRepository = BotContainer.get(CommandAliasesRepository);
    }

    public async execute(channel: string, user: IUser, ...args: any[]): Promise<void> {
        // Restore original functionality
        await Command.prototype.execute.call(this, channel, user, args);
    }

    public async executeInternal(channel: string, user: IUser, args: any[]): Promise<void> {
        const commandText1 = await this.prepareCommand(channel, user, args[0] as string, []);
        const commandText2 = await this.prepareCommand(channel, user, args[1] as string, args.slice(2));

        if (!commandText1 || !commandText2) {
            return;
        }

        await this.executeWithOptions(commandText1.commandInfo, channel, user, [commandText2.msg]);
    }

    private async prepareCommand(channel: string, user: IUser, commandName: string, args: any[]): Promise<{commandInfo: ITextCommand, msg: string } | undefined> {
        // If empty, just return
        if (!commandName) {
            return undefined;
        }

        // Remove ! if it's at the start of the command.
        if (commandName[0] === "!") {
            commandName = commandName.substring(1);
        }

        // If this is an alias, update the command name to be the actual command
        // so that we can get the description
        const commandNameIfAlias = await this.getAliasCommandName(commandName);
        if (commandNameIfAlias) {
            commandName = commandNameIfAlias;
        }

        const commandInfo = await this.textCommands.get(commandName);
        if (!commandInfo) {
            return undefined;
        }

        if (commandInfo.minimumUserLevel) {
            if (!user?.userLevel || user.userLevel < commandInfo.minimumUserLevel) {
                await this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.` );
                return undefined;
            }
        }

        const msg = await this.textCommand.getCommandText(user, commandName, commandInfo.messageType === TextCommandMessagType.AiPrompt, [commandInfo.message, ...args]);
        return { commandInfo, msg };
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
        return "Chains two commands, using the output from the last command as input for the first one. Usage: !chain !command1 !command2";
    }
}

