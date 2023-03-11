export enum ProviderType {
    Twitch,
    Streamlabs,
    Youtube,
    Spotify,
    DropBox
}

export interface IUserAuth {
    accessToken: string;
    refreshToken: string;
    scope: string;
    type: ProviderType;
    userId: number;
}

export interface IUserPrincipal extends IUserAuth {
    username: string;
    foreignUserId?: number;
}