//import * as Commands from "../commands/commandScripts";
import { injectable, inject } from "inversify";
import { Logger, LogType } from "../logger";
import { TwitchChatParser } from "../helpers";
import { CommandNotExistError, CommandInternalError } from "../errors";
import { Command } from "../commands/command";
import { TextCommandsRepository } from "../database/textCommands";
import { IUser } from "../models";
import { UserService } from "./userService";
import { TwitchService } from "./twitchService";
import { CommandAliasesRepository } from "../database/commandAliases";

@injectable()
export class CommandService {
    constructor(
        @inject(TextCommandsRepository)
        private textCommands: TextCommandsRepository,
        private aliasCommands: CommandAliasesRepository,
        @inject(UserService) private users: UserService,
        @inject("Commands") private commandList: Map<string, Command>,
        @inject(TwitchService) private twitchService: TwitchService
    ) {
        this.twitchService.setCommandCallback((channel: string, username: string, message: string) =>
            this.handleMessage(channel, username, message)
        );
    }

    /**
     * Execute a command
     * @param {string} commandName The command name to execute
     * @param {IUser} user The user object of the user that is executing the command
     * @param {string} channel The channel the execute the command in
     */
    private async executeCommand(commandName: string, channel: string, user: IUser, ...args: string[]): Promise<void> {
        if (this.commandList.has(commandName)) {
            // Execute a system defined command
            const command = this.commandList.get(commandName);
            this.executeCommandInternal(command, commandName, channel, user, args);
        } else {
            // Execute a command by user defined command alias
            const commandAlias = await this.aliasCommands.get(commandName);
            if (commandAlias) {
                const command = this.commandList.get(commandAlias.commandName);
                if (commandAlias.commandArguments) {
                    this.executeCommandInternal(
                        command,
                        commandName,
                        channel,
                        user,
                        commandAlias.commandArguments.split(" ")
                    );
                } else {
                    this.executeCommandInternal(command, commandName, channel, user, args);
                }
            } else {
                // Execute a user defined text command
                const textCommand = await this.textCommands.get(commandName);
                if (textCommand) {
                    if (this.commandList.has("text")) {
                        const command = this.commandList.get("text") as Command;
                        command.execute(channel, user, textCommand.message);
                    }
                }
            }
        }
    }

    private executeCommandInternal(
        command: Command | undefined,
        commandName: string,
        channel: string,
        user: IUser,
        args: string[]
    ) {
        if (command && !command.isInternal()) {
            const aliasArgs = this.getAliasArgs(command, commandName);
            if (aliasArgs) {
                command.execute(channel, user, ...aliasArgs);
            } else {
                command.execute(channel, user, ...args);
            }
        } else if (command && command.isInternal()) {
            throw new CommandInternalError(
                `The command ${command} is an internal command that has been called through a chat command.`
            );
        } else {
            throw new CommandNotExistError(`The command ${command} doesn't exist.`);
        }
    }

    /**
     * Determines the arguments to pass to the aliased command.
     * @param command Command being executed
     * @param aliasName Name that was used to call the command (alias).
     */
    private getAliasArgs(command: Command, aliasName: string): string[] | undefined {
        for (const alias of command.getAliases()) {
            if (alias.alias === aliasName && alias.commandArguments) {
                return [alias.commandArguments];
            }
        }

        return undefined;
    }

    /**
     * Parses a message from a channel to see if it's a command and if it is, attempt to execute that command.
     * @param {string} channel The channel the message comes from.
     * @param {string} username The username of the user that sent the message.
     * @param {string} message The message to parse for a command.
     */
    public async handleMessage(channel: string, username: string, message: string): Promise<void> {
        const commandName = TwitchChatParser.getCommandName(message);
        if (commandName) {
            try {
                const user = await this.users.getUser(username);
                const args = TwitchChatParser.getCommandArgs(message);
                if (args) {
                    this.executeCommand(commandName, channel, user, ...args);
                } else {
                    this.executeCommand(commandName, channel, user, "");
                }
            } catch (err) {
                if (err instanceof CommandNotExistError) {
                    Logger.err(LogType.Command, `${err.name} -- ${err.message}`);
                } else if (err instanceof CommandInternalError) {
                    Logger.err(LogType.Command, `${err.name} -- ${err.message}`);
                } else {
                    throw err;
                }
            }
        }
    }
}

export default CommandService;
