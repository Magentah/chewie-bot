import { injectable, inject } from 'inversify';
import { Command } from '../commands/command';
import TwitchChatParser from '../helpers/twitchChatParser';
import CommandNotExist from '../errors/commandNotExist';
import { Logger } from '@overnightjs/logger';
import * as Commands from '../commands/commandScripts';

@injectable()
export class CommandService {
    private commands: Map<string, Command>;

    constructor() {
        this.commands = new Map<string, Command>();
        this.findCommands();
    }

    /**
     * Iterate through the Commands object from commandScripts/index.ts to find all commands and add them to the map
     */
    private findCommands(): void {
        Object.keys(Commands).forEach((val, index) => {
            this.addCommand(
                val.substr(0, val.toLowerCase().indexOf('command')).toLowerCase(),
                // Add a new instance of the command so that we can call functions on it. Adding without new won't work as it's just a type name otherwise
                new (Object.values(Commands)[index])());
        });
    }

    /**
     * Add a command to the command map
     * @param commandName Lowercase name for the command
     * @param command Instance of the command object
     */
    private addCommand(commandName: string, command: Command): void {
        this.commands.set(commandName.toLowerCase(), command);
    }

    /**
     * Execute a command
     * @param commandName The command name to execute
     * @param channel The channel the execute the command in
     */
    private executeCommand(commandName: string, channel: string): void {
        if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command) {
                command.execute(channel);
            } else {
                throw new CommandNotExist(`The command ${command} doesn't exist.`);
            }
        }
    }

    /**
     * Parses a message from a channel to see if it's a command and if it is, attempt to execute that command.
     * @param channel The channel the message comes from.
     * @param message The message to parse for a command.
     */
    public handleMessage(channel: string, message: string): void {
        const commandName = TwitchChatParser.getCommandName(message);
        if (commandName) {
            try {
                this.executeCommand(commandName, channel);
            } catch (err) {
                if (err instanceof CommandNotExist) {
                    Logger.Info(`${err.name} -- ${err.message}`);
                } else {
                    throw err;
                }
            }
        }
    }
}

export default CommandService;
