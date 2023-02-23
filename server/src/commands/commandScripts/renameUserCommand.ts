import { Command } from "../command";
import { DatabaseService, EventLogService, UserService } from "../../services";
import { ICommandAlias, IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";

export default class RenameUserCommand extends Command {
    private userService: UserService;
    private eventLog: EventLogService;
    private databaseService: DatabaseService;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.eventLog = BotContainer.get(EventLogService);
        this.databaseService = BotContainer.get(DatabaseService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, oldUserName: string, newUserName: string) {
        if (await this.isReadOnly(channel)) {
            return;
        }

        if (!oldUserName || !newUserName) {
            await this.twitchService.sendMessage(channel, "Use !renameuser <olduser> <newuser> to rename.");
            return;
        }

        const oldUser = await this.userService.getUser(oldUserName);
        if (!oldUser) {
            await this.twitchService.sendMessage(channel, `${oldUserName} is unknown, renaming not possible.`);
            return;
        }

        // Prevent new usernames being created with @
        newUserName = newUserName.startsWith("@") ? newUserName.substring(1) : newUserName;

        if (oldUser.username === newUserName) {
            await this.twitchService.sendMessage(channel, "User names cannot be identical.");
            return;
        }

        try {
            const newUser = await this.userService.getUser(newUserName);

            try {
                await this.databaseService.transaction((async trx => {
                    this.databaseService.useTransaction(trx);

                    if (newUser) {
                        // If new user already exists in the database, take any points from this user,
                        // add it to the old user and rename.
                        await this.userService.changeUserPoints(oldUser, newUser.points, PointLogType.Rename);

                        await this.userService.moveUserData(newUser, oldUser);

                        if (!await this.userService.deleteUser(newUser)){
                            await this.twitchService.sendMessage(channel, `Cannot delete existing record for ${newUserName}, renaming not possible.`);
                            return;
                        }
                    }

                    // Rename existing user.
                    await this.userService.renameUser(oldUser, newUserName);

                    await this.eventLog.addUserRename(user, oldUserName, newUserName);
                }));
            } finally {
                this.databaseService.useTransaction(undefined);
            }

            await this.twitchService.sendMessage(channel, `Renamed ${oldUserName} to ${newUserName} successfully.`);
        }  catch (err: any) {
            await this.twitchService.sendMessage(channel, `User cannot be renamed (${err.code}).`);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "rename", commandName: "renameuser" }
        ];
    }

    public async getDescription(): Promise<string> {
        return `Renames a user in the database. To be used when user has changed the Twitch user name. Usage: !renameuser <oldname> <newname>`;
    }
}
