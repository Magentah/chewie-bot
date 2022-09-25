import { Command } from "../../command";
import { UserService } from "../../../services";
import { ICommandAlias, IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

export default class PointsCommand extends Command {
    private userService: UserService;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, targetUserName: string): Promise<void> {
        if (targetUserName) {
            // Allow mods to see the status of any user.
            if (user.userLevel && user.userLevel >= UserLevels.Moderator) {
                const targetUser = await this.userService.getUser(targetUserName);
                if (targetUser) {
                    this.twitchService.sendMessage(channel, Lang.get("points.status", targetUser.username, targetUser.points));
                } else {
                    this.twitchService.sendMessage(channel, Lang.get("points.userunknown", targetUserName));
                }
            }
        } else {
            this.twitchService.sendMessage(channel, Lang.get("points.status", user.username, user.points));
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "chews", commandName: "points" }];
    }

    public async getDescription(): Promise<string> {
        return `Displays the amount of points you have. Usage: !points [<user>]`;
    }
}
