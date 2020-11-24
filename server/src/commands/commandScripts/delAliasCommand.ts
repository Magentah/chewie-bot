import { Command } from "../command";
import { CommandAliasesRepository, UserLevelsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { BotContainer } from "../../inversify.config";
import { IUser, IUserLevel } from "../../models";

export class DelAliasCommand extends Command {
    constructor() {
        super();
        // TODO: make userlevels constants
        BotContainer.get(UserLevelsRepository)
            .get("Broadcaster")
            .then((userLevel: IUserLevel) => {
                this.minimumUserLevel = userLevel;
            });
    }

    public async execute(channel: string, user: IUser, alias: string): Promise<void> {
        if (!alias) {
            return;
        }

        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel.rank) {
            const deleted = await BotContainer.get(CommandAliasesRepository).delete(alias);
            if (deleted) {
                await BotContainer.get(TwitchService).sendMessage(channel, `!${alias} has been removed!`);
            }
        }
    }
}

export default DelAliasCommand;
