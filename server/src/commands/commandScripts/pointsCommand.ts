import { Command } from "../command";
import { TwitchService } from "../../services";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { Lang } from "../../lang";

export default class PointsCommand extends Command {
    constructor() {
        super();
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        this.twitchService.sendMessage(channel, Lang.get("points.status", user.username, user.points));
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "chews", commandName: "points" }];
    }
}
