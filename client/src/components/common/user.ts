import { UserLevels } from "./userLevel";

export default interface ITwitchUserProfile {
    id: number;
    displayName: string;
    username: string;
    profileImageUrl: string;
}

export interface IUser {
    id?: number;
    username: string;
    refreshToken?: string;
    points: number;
    vipExpiry?: Date;
    vipLastRequest?: Date;
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevel: UserLevels;
    twitchUserProfile?: ITwitchUserProfile;
}

export interface IVIPLevel {
    id?: number;
    name: string;
    rank: number;
}
