import { injectable } from 'inversify';
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
            const commandName = val.substr(0, val.toLowerCase().indexOf('command'));
            const command = new (Object.values(Commands)[index])();
            this.commands.set(commandName.toLowerCase(), command);
        });
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
