export interface IConfig {
    twitch: ITwitchConfig;
}

export interface ITwitchConfig {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    username: string;
    oauth: string;
}
