export interface IConfig {
    twitch: ITwitchConfigSection;
    youtube: IYoutubeSection;
    secretKey: string;
    log: ILogSection;
    database: IDatabaseSection;
}

interface ITwitchConfigSection {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    username: string;
    oauth: string;
}

interface IYoutubeSection {
    apiKey: string;
}

interface ILogSection {
    levels: string;
    level: string;
    enabledLogs: ILogSectionEnabledLogs;
}

interface ILogSectionEnabledLogs {
    cache: boolean;
    command: boolean;
    database: boolean;
    oauth: boolean;
    songs: boolean;
    twitch: boolean;
    server: boolean;
    serverinfo: boolean;
}

interface IDatabaseSection {
    client: string;
    version: string;
    connection: IDatabaseSectionConnection;
}

interface IDatabaseSectionConnection {
    host: string;
    user: string;
    password: string;
    name: string;
}
