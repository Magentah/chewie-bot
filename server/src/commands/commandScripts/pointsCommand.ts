import { Command } from "../command";
import { TwitchService } from "../../services";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { Lang } from "../../lang";

export default class PointsCommand extends Command {
    private twitchService: TwitchService;

    constructor() {
        super();
        this.twitchService = BotContainer.get(TwitchService);
    }

    public async execute(channel: string, user: IUser): Promise<void> {
        this.twitchService.sendMessage(channel, Lang.get("points.status", user.username, user.points));
    }
}