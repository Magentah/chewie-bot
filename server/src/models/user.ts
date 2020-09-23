import { IUserLevel } from "./userLevel";
import { IVIPLevel } from "./vipLevel";

export interface IUser {
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
    streamlabsRefresh?: string;
}
