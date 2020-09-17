import { Command } from "../command";
import TextCommandsRepository from "./../../database/textCommands";
import TwitchService from "./../../services/twitchService";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models/user";
import UserLevelsRepository from "../../database/userLevelsRepository";
import { IUserLevel } from "src/models/userLevel";

export class AddCmdCommand extends Command {
    constructor() {
        super();
        // TODO: make userlevels constants
        BotContainer.get(UserLevelsRepository)
            .get("Broadcaster")
            .then((userLevel: IUserLevel) => {
                this.minimumUserLevel = userLevel;
            });
    }

    public async execute(channel: string, user: IUser, commandName: string, message: string): Promise<void> {
        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel.rank) {
            let command = await BotContainer.get(TextCommandsRepository).get(commandName);
            if (!command) {
                command = {
                    commandName,
                    message,
                };

                await BotContainer.get(TextCommandsRepository).add(command);
                await BotContainer.get(TwitchService).sendMessage(channel, `!${commandName} has been added!`);
            }
        }
    }
}

export default AddCmdCommand;
