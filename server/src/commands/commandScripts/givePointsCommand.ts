import { Command } from "../command";
import { UserService } from "../../services";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { Lang } from "../../lang";
import { PointLogType } from "../../models/pointLog";

export default class GivePointsCommand extends Command {
    private userService: UserService;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, targetUsername: string, points: number) {
        if (!targetUsername || !points || !Number.isInteger(points)) {
            this.twitchService.sendMessage(channel, Lang.get("points.give.wrongarguments", user.username));
            return;
        }

        if (targetUsername === user.username) {
            this.twitchService.sendMessage(channel, Lang.get("points.give.noself", user.username));
            return;
        }

        if (points > user.points) {
            this.twitchService.sendMessage(channel, Lang.get("points.give.insufficientpoints", user.username));
            return;
        }

        let targetUser = await this.userService.getUser(targetUsername);
        if (!targetUser) {
            if (await this.twitchService.userExistsInChat(channel, targetUsername)) {
                targetUser = await this.userService.addUser(targetUsername);
            }
        }

        if (!targetUser) {
            this.twitchService.sendMessage(channel, Lang.get("points.userunknown", targetUsername));
            return;
        }

        await this.userService.changeUserPoints(user, -points, PointLogType.Give);
        await this.userService.changeUserPoints(targetUser, points, PointLogType.Give);
        this.twitchService.sendMessage(channel, Lang.get("points.give.success", user.username, targetUsername, points));
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "give", commandName: "givepoints" },
            { alias: "choos", commandName: "givepoints" },
        ];
    }
}
