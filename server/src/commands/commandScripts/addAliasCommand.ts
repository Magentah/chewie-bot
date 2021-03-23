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
    private twitchService: TwitchService;

    constructor() {
        super();

        this.commandAliases = BotContainer.get(CommandAliasesRepository);
        this.twitchService = BotContainer.get(TwitchService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async execute(channel: string, user: IUser, newAlias: string, command: string, ...args: string[]): Promise<void> {
        if (!command || !newAlias) {
            return;
        }

        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel) {
            let alias = await this.commandAliases.get(newAlias);
            if (!alias) {
                // Remove all preceding exclamation marks if present.
                if (newAlias.startsWith("!")) {
                    newAlias = newAlias.substr(1);
                }

                if (command.startsWith("!")) {
                    command = command.substr(1);
                }

                alias = {
                    alias: newAlias,
                    commandName: command,
                    commandArguments: args,
                };

                await this.commandAliases.add(alias);
                await this.twitchService.sendMessage(channel, `!${newAlias} has been added!`);
            }
        }
    }
}
