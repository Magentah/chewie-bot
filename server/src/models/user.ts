import IUserLevel from "./userLevel";
import IVIPLevel from "./vipLevel";
import ITwitchUserProfile from "./twitchUserProfile";

export default interface IUser {
    id?: number;
    username: string;
    idToken?: string;
    refreshToken?: string;
    points: number;
    vipExpiry?: Date;
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevelKey?: number;
    userLevel?: IUserLevel;
    hasLogin: boolean;
    streamlabsToken?: string;
    streamlabsSocketToken?: string;
    streamlabsRefresh?: string;
    spotifyRefresh?: string;
    twitchProfileKey?: number;
    twitchUserProfile?: ITwitchUserProfile;
}
