import { IUserLevel, IVIPLevel } from "./";

export default interface IUser {
    id?: number;
    username: string;
    idToken?: string;
    accessToken?: string;
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


