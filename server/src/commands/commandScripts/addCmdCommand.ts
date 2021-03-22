import { Command } from "../command";
import { TextCommandsRepository } from "./../../database";
import { TwitchService } from "./../../services";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";

export default class AddCmdCommand extends Command {
    private textCommands: TextCommandsRepository;
    private twitchService: TwitchService;

    constructor() {
        super();

        this.textCommands = BotContainer.get(TextCommandsRepository);
        this.twitchService = BotContainer.get(TwitchService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async execute(channel: string, user: IUser, commandName: string, message: string): Promise<void> {
        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel) {
            let command = await this.textCommands.get(commandName);
            if (!command) {
                command = {
                    commandName,
                    message,
                };

                await this.textCommands.add(command);
                await this.twitchService.sendMessage(channel, `!${commandName} has been added!`);
            }
        }
    }
}
