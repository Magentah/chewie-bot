import { injectable, inject } from "inversify";
import { UserService, TwitchWebService } from "./";
import { IUserPrincipal, ProviderType, IUser, UserLevelName, IUserLevel, ITwitchUser} from "../models";
import { UserLevelsRepository } from '../database';
import * as Config from '../config.json'

@injectable()
export class UserPermissionService {
    constructor(@inject(UserService) private userService: UserService,
                @inject(TwitchWebService) private twitchWebService: TwitchWebService,
                @inject(UserLevelsRepository) private userLevelsRepository: UserLevelsRepository){
    }

    public async updateUserLevels(user: string | IUser, twitchCheck: boolean = true): Promise<void> {
        let username: string;
        let _user: IUser;

        if (typeof user === 'string'){
            username = user as string;
            _user = await this.userService.getUser(username);
        } else {
            username = user.username;
            _user = user as IUser;
        }

        const userCtx: IUserPrincipal = await this.userService.getUserPrincipal(username, ProviderType.Twitch);

        let newUserLevel: IUserLevel;
        
        if (this.isUserBroadcaster(username)){
            newUserLevel = await this.userLevelsRepository.get(UserLevelName.Broadcaster);

        } else if(await this.isUserModded(userCtx)){
            newUserLevel = await this.userLevelsRepository.get(UserLevelName.Moderator);
            
        } else if (await this.isUserSubbed(userCtx)){
            newUserLevel = await this.userLevelsRepository.get(UserLevelName.Subscriber);

        } else {
            newUserLevel= await this.userLevelsRepository.get(UserLevelName.Viewer);
        }

        return this.updateUserLevelForUser(_user, newUserLevel);
    }

    private async updateUserLevelForUser(user: IUser, userLevel: IUserLevel): Promise<void> {
        if (user.userLevelKey != userLevel.id) {
            user.userLevelKey = userLevel.id;
            return this.userService.updateUser(user);
        }
    }

    private async isUserModded(userCtx: IUserPrincipal): Promise<boolean> {
        const mods: Array<ITwitchUser> = await this.twitchWebService.fetchModerators([userCtx]);
        return mods.length > 1;
    }

    private async isUserSubbed(userCtx: IUserPrincipal): Promise<boolean> {
        const subs: Array<any> = await this.twitchWebService.fetchSubscribers([userCtx]);
        return subs.length > 1;
    }

    private isUserBroadcaster(username: string): boolean { 
        return username == Config.twitch.broadcasterName;
    }
}

export default UserPermissionService;