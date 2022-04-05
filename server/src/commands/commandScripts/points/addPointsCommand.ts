import { Command } from "../../command";
import { UserService } from "../../../services";
import { ICommandAlias, IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";
import { PointLogType } from "../../../models/pointLog";

export default class AddPointsCommand extends Command {
    private userService: UserService;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, targetUsername: string, points: number) {
        if (await this.isReadOnly(channel)) {
            return;
        }

        if (!targetUsername || !points || !Number.isInteger(points)) {
            this.twitchService.sendMessage(channel, Lang.get("points.add.wrongarguments", user.username));
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

        await this.userService.changeUserPoints(targetUser, points, PointLogType.Add);
        this.twitchService.sendMessage(channel, Lang.get("points.add.success", user.username, targetUsername, points));
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "add", commandName: "addpoints" },
            { alias: "addchews", commandName: "addpoints" },
        ];
    }

    public getDescription(): string {
        return `Adds the specified amount of points to the target user. Usage: !addpoints <user> <amount>`;
    }
}
