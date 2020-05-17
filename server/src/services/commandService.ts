import { injectable, inject } from 'inversify';
import { Command } from '../commands/command';
import TwitchChatParser from '../helpers/twitchChatParser';
import CommandNotExistError from '../errors/commandNotExist';
import CommandInternalError from '../errors/commandInternal';
import { Logger, LogType } from '../logger';
import * as Commands from '../commands/commandScripts';
import TextCommandsRepository from '../database/textCommands';
import { IUser } from '../models/user';
import UserService from './userService';

@injectable()
export class CommandService {
    private commands: Map<string, Command>;

    constructor(@inject(TextCommandsRepository) private textCommands: TextCommandsRepository, @inject(UserService) private users: UserService) {
        this.commands = new Map<string, Command>();
        this.findCommands();
    }

    /**
     * Iterate through the Commands object from commandScripts/index.ts to find all commands and add them to the map
     */
    private findCommands(): void {
        Object.keys(Commands).forEach((val, index) => {
            const commandName = val.substr(0, val.toLowerCase().indexOf('command'));
            const command = new (Object.values(Commands)[index])();
            this.commands.set(commandName.toLowerCase(), command);
        });
    }

    /**
     * Execute a command
     * @param {string} commandName The command name to execute
     * @param {IUser} user The user object of the user that is executing the command
     * @param {string} channel The channel the execute the command in
     */
    private async executeCommand(commandName: string, channel: string, user: IUser, ...args: string[]): Promise<void> {
        if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command && !command.isInternal()) {
                command.execute(channel, user, ...args);
            } else if (command && command.isInternal()) {
                throw new CommandInternalError(`The command ${command} is an internal command that has been called through a chat command.`);
            } else {
                throw new CommandNotExistError(`The command ${command} doesn't exist.`);
            }
        } else {
            const textCommand = await this.textCommands.get(commandName);
            if (textCommand) {
                if (this.commands.has('text')) {
                    const command = this.commands.get('text') as Command;
                    command.execute(channel, user, textCommand.message);
                }
            }
        }
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
                    this.executeCommand(commandName, channel, user);
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
