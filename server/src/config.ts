import * as c from "./config.json";

class Config {
    public static twitch: ITwitchConfigSection;
    public static youtube: IYoutubeSection;
    public static secretKey: string;
    public static log: ILogSection;
    public static database: IDatabaseSection;

    // There has to be a better way to do this...
    public static initialize(): void {
        const config = (c as unknown) as IConfig;

        Config.twitch = config.twitch;
        Config.youtube = config.youtube;
        Config.secretKey = config.secretKey;
        Config.log = config.log;
        Config.database = config.database;

        if (process.env.NODE_ENV === "production") {
            Config.twitch.clientId = process.env.TWITCH_CLIENT_ID ?? "";
            Config.twitch.clientSecret = process.env.TWITCH_CLIENT_SECRET ?? "";
            Config.twitch.redirectUri = process.env.TWITCH_REDIRECT_URI ?? "";
            Config.youtube.apiKey = process.env.YOUTUBE_API ?? "";
            Config.secretKey = process.env.SECRET_KEY ?? "";
        }
    }
}

Config.initialize();

export default Config;

// Interfaces for config.
interface IConfig {
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
