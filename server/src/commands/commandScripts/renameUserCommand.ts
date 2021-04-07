import { Command } from "../command";
import { EventLogService, UserService } from "../../services";
import { ICommandAlias, IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";

export default class RenameUserCommand extends Command {
    private userService: UserService;
    private eventLog: EventLogService;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.eventLog = BotContainer.get(EventLogService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, oldUserName: string, newUserName: string) {
        if (!oldUserName || !newUserName) {
            this.twitchService.sendMessage(channel, "Use !renameuser <olduser> <newuser> to rename.");
            return;
        }

        if (oldUserName === newUserName) {
            this.twitchService.sendMessage(channel, "User names cannot be identical.");
            return;
        }

        const oldUser = await this.userService.getUser(oldUserName);
        if (!oldUser) {
            this.twitchService.sendMessage(channel, `${oldUserName} is unknown, renaming not possible.`);
            return;
        }

        try {
            const newUser = await this.userService.getUser(newUserName);
            if (newUser) {
                // If new user already exists in the database, take any points from this user,
                // add it to the old user and rename.
                await this.userService.changeUserPoints(oldUser, newUser.points, PointLogType.Rename);
                if (!await this.userService.deleteUser(newUser)){
                    this.twitchService.sendMessage(channel, `Cannot delete existing record for ${newUserName}, renaming not possible.`);
                    return;
                }
            }

            // Rename existing user.
            await this.userService.renameUser(oldUser, newUserName);

            this.eventLog.addUserRename(user, oldUserName, newUserName);

            this.twitchService.sendMessage(channel, `Renamed ${oldUserName} to ${newUserName} successfully.`);
        }  catch (err) {
            this.twitchService.sendMessage(channel, `User cannot be renamed (${err.code}).`);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "rename", commandName: "renameuser" }
        ];
    }
}
