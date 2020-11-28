import { Command } from "../command";
import { CommandAliasesRepository, UserLevelsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { BotContainer } from "../../inversify.config";
import { IUser, IUserLevel } from "../../models";

/**
 * Allows adding a new alias for an existing command.
 * Usage: !addalias <name> <command> [<arguments>]
 */
export class AddAliasCommand extends Command {
    constructor() {
        super();
        // TODO: make userlevels constants
        BotContainer.get(UserLevelsRepository)
            .get("Broadcaster")
            .then((userLevel: IUserLevel) => {
                this.minimumUserLevel = userLevel;
            });
    }

    public async execute(channel: string, user: IUser, newAlias: string, command: string, args: string): Promise<void> {
        if (!command || !newAlias) {
            return;
        }

        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel.rank) {
            let alias = await BotContainer.get(CommandAliasesRepository).get(newAlias);
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
                    commandArguments: args
                };

                await BotContainer.get(CommandAliasesRepository).add(alias);
                await BotContainer.get(TwitchService).sendMessage(channel, `!${newAlias} has been added!`);
            }
        }
    }
}

export default AddAliasCommand;
