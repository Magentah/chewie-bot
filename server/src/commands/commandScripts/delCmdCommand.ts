import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export class DelCmdCommand extends Command {
    private twitchService: TwitchService;
    private textCommands: TextCommandsRepository;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.textCommands = BotContainer.get(TextCommandsRepository);
        
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async execute(channel: string, user: IUser, commandName: string): Promise<void> {
        const deleted = await this.textCommands.delete(commandName);
        if (deleted) {
            await this.twitchService.sendMessage(channel, `!${commandName} has been removed!`);
        }
    }
}

export default DelCmdCommand;
