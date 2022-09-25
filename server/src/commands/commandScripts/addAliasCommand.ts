import { Command } from "../command";
import { CommandAliasesRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

/**
 * Allows adding a new alias for an existing command.
 * Usage: !addalias <name> <command> [<arguments>]
 */
export default class AddAliasCommand extends Command {
    private commandAliases: CommandAliasesRepository;

    constructor() {
        super();

        this.commandAliases = BotContainer.get(CommandAliasesRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, newAlias: string, command: string, ...args: string[]): Promise<void> {
        if (!command || !newAlias) {
            return;
        }

        // Remove all preceding exclamation marks if present.
        if (newAlias.startsWith("!")) {
            newAlias = newAlias.substring(1);
        }

        let alias = await this.commandAliases.get(newAlias);
        if (!alias) {
            if (command.startsWith("!")) {
                command = command.substring(1);
            }

            alias = {
                alias: newAlias,
                commandName: command,
                commandArguments: args.join(" "),
            };

            await this.commandAliases.add(alias);
            this.twitchService.sendMessage(channel, `!${newAlias} has been added.`);
        } else {
            this.twitchService.sendMessage(channel, `!${newAlias} already exists.`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Adds an alias (<name>) for an existing command (<command>) which can be called with an optional list of arguments. Usage: !addalias <name> <command> [<arguments>] `;
    }
}
