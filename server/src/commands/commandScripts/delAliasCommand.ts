import { Command } from "../command";
import { CommandAliasesRepository, UserLevelsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export class DelAliasCommand extends Command {
    private twitchService: TwitchService;
    private commandAliases: CommandAliasesRepository;
    private userLevels: UserLevelsRepository;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.userLevels = BotContainer.get(UserLevelsRepository);
        this.commandAliases = BotContainer.get(CommandAliasesRepository);

        this.minimumUserLevel = UserLevels.Broadcaster;
    }

    public async execute(channel: string, user: IUser, alias: string): Promise<void> {
        if (!alias) {
            return;
        }

        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel) {
            const deleted = await this.commandAliases.delete(alias);
            if (deleted) {
                await this.twitchService.sendMessage(channel, `!${alias} has been removed!`);
            }
        }
    }
}

export default DelAliasCommand;
