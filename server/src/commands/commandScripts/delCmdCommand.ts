import { Command } from "../command";
import { TextCommandsRepository, UserLevelsRepository } from "./../../database";
import { TwitchService, EventService, UserService } from "./../../services";
import { IUser } from "../../models";
import { inject } from "inversify";
import { BotContainer } from "../../inversify.config";

export class DelCmdCommand extends Command {
    private twitchService: TwitchService;
    private textCommands: TextCommandsRepository;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.textCommands = BotContainer.get(TextCommandsRepository);
    }

    public async execute(channel: string, user: IUser, commandName: string): Promise<void> {
        const deleted = await this.textCommands.delete(commandName);
        if (deleted) {
            await this.twitchService.sendMessage(channel, `!${commandName} has been removed!`);
        }
    }
}

export default DelCmdCommand;
