import { Command } from "../command";
import { TwitchService, UserService } from "../../services";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { Lang } from "../../lang";

export default class GivePointsCommand extends Command {
    private twitchService: TwitchService;
    private userService: UserService;

    constructor() {
        super();
        this.twitchService = BotContainer.get(TwitchService);
        this.userService = BotContainer.get(UserService);
    }

    public async execute(channel: string, user: IUser, targetUsername: string, points: number) {
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

        // TODO: This is going to cause issues currently for users that exist in chat but haven't logged in. This should really check to see if
        // the user is in chat as well, and if they are, create a new user in the db for them.
        const targetUser = await this.userService.getUser(targetUsername);
        if (!targetUser) {
            this.twitchService.sendMessage(channel, Lang.get("points.give.userunknown", targetUsername));
            return;
        }

        await this.userService.changeUserPoints(user, -points);
        await this.userService.changeUserPoints(targetUser, points);
        this.twitchService.sendMessage(channel, Lang.get("points.give.success", user.username, targetUsername, points));
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "give", commandName: "givepoints" },
            { alias: "choos", commandName: "givepoints" },
        ];
    }
}
