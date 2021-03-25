import { Command } from "../command";
import { CommandAliasesRepository, UserLevelsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export class DelAliasCommand extends Command {
    private commandAliases: CommandAliasesRepository;

    constructor() {
        super();

        this.commandAliases = BotContainer.get(CommandAliasesRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, alias: string): Promise<void> {
        if (!alias) {
            return;
        }

        const deleted = await this.commandAliases.delete(alias);
        if (deleted) {
            await this.twitchService.sendMessage(channel, `!${alias} has been removed!`);
        }
    }
}

export default DelAliasCommand;
