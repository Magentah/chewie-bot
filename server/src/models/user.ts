import { UserLevels } from "./userLevel";
import IVIPLevel from "./vipLevel";
import ITwitchUserProfile from "./twitchUserProfile";

export default interface IUser {
    id?: number;
    username: string;
    points: number;
    vipExpiry?: Date;
    vipLastRequest?: Date;
    vipPermanentRequests?: number;
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevel: UserLevels;
    hasLogin: boolean;
    twitchProfileKey?: number;
    twitchUserProfile?: ITwitchUserProfile;
}
