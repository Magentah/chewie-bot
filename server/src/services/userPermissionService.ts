import { injectable, inject } from "inversify";
import { UserService, TwitchWebService } from "./";
import { IUser, IUserLevel, ITwitchUser, UserLevels} from "../models";
import { UserLevelsRepository } from "../database";
import * as Config from "../config.json";

@injectable()
export class UserPermissionService {
    constructor(@inject(UserService) private userService: UserService,
                @inject(TwitchWebService) private twitchWebService: TwitchWebService,
                @inject(UserLevelsRepository) private userLevelsRepository: UserLevelsRepository) {
    }

    public async updateUserLevels(user: string | IUser): Promise<void> {
        let username: string;
        let userData: IUser;

        if (typeof user === "string") {
            username = user as string;
            userData = await this.userService.getUser(username);
        } else {
            username = user.username;
            userData = user as IUser;
        }

        let newUserLevel: IUserLevel;

        if (this.isUserBroadcaster(username)) {
            newUserLevel = await this.userLevelsRepository.get(UserLevels.Broadcaster);
        } else if (await this.isUserModded(username)) {
            newUserLevel = await this.userLevelsRepository.get(UserLevels.Moderator);
        } else if (await this.isUserSubbed(username)) {
            newUserLevel = await this.userLevelsRepository.get(UserLevels.Subscriber);
        } else {
            newUserLevel = await this.userLevelsRepository.get(UserLevels.Viewer);
        }

        return this.updateUserLevelForUser(userData, newUserLevel);
    }

    private async updateUserLevelForUser(user: IUser, userLevel: IUserLevel): Promise<void> {
        if (user.userLevelKey !== userLevel.id) {
            user.userLevelKey = userLevel.id;
            return this.userService.updateUser(user);
        }
    }

    private async isUserModded(username: string): Promise<boolean> {
        const mods: ITwitchUser[] = await this.twitchWebService.fetchModerators([username]);
        return mods.length > 1;
    }

    private async isUserSubbed(username: string): Promise<boolean> {
        const subs: any[] = await this.twitchWebService.fetchSubscribers([username]);
        return subs.length > 1;
    }

    private isUserBroadcaster(username: string): boolean {
        return username === Config.twitch.broadcasterName;
    }
}

export default UserPermissionService;
