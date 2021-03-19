import { inject, injectable } from "inversify";
import * as Config from "../config.json";
import Constants from "../constants";
import axios, { AxiosRequestConfig } from "axios";
import { DiscordRepository } from "../database";
import { IDiscordSetting } from "../models";

enum DiscordSettingName {
    OnlineMessage = "online.message",
    OnlineUrl = "online.url",
    OnlineImage = "online.image",
    OnlineAuthorName = "online.author.name",
    OnlineAuthorUrl = "online.author.url",
    OnlineAuthorIcon = "online.author.icon",
    OnlineTitle = "online.title",
    OnlineDescription = "online.description",
    OnlineColor = "online.color",
    OfflineMessage = "offline.message",
    OfflineUrl = "offline.url",
    OfflineImage = "offline.image",
    OfflineAuthorName = "offline.author.name",
    OfflineAuthorUrl = "offline.author.url",
    OfflineAuthorIcon = "offline.author.icon",
    OfflineTitle = "offline.title",
    OfflineDescription = "offline.description",
    OfflineColor = "offline.color",
}

// TODO: This all seems pretty badly done, should rethink a better way to handle this.

@injectable()
export default class DiscordService {
    private enabled: boolean = Config.discord.enabled;
    private hasInit: boolean = false;
    private duringInit: boolean = false;
    private settings!: { [name: string]: IDiscordSetting };
    constructor(@inject(DiscordRepository) private discordRepo: DiscordRepository) {
        this.getAllSettings().then(() => {
            this.hasInit = true;
        });
    }

    /**
     * Send SteamOnline message to Discord Webhook
     */
    public async sendStreamOnline(): Promise<void> {
        if (!this.enabled) {
            return;
        }
        if (!this.hasInit) {
            setTimeout(this.sendStreamOnline, 500);
        } else {
            const body = this.createRequestBody(this.setting(DiscordSettingName.OnlineMessage, ""), [
                {
                    title: this.setting(DiscordSettingName.OnlineTitle, "Chewie is online!"),
                    description: this.setting(DiscordSettingName.OnlineDescription),
                    color: this.setting(DiscordSettingName.OnlineColor),
                    url: this.setting(
                        DiscordSettingName.OnlineUrl,
                        `${Constants.TwitchUri}/${Config.twitch.broadcasterName}`
                    ),
                    image: {
                        url: this.setting(DiscordSettingName.OnlineImage),
                    },
                    author: {
                        name: this.setting(DiscordSettingName.OnlineAuthorName, Config.twitch.broadcasterName),
                        url: this.setting(
                            DiscordSettingName.OnlineAuthorUrl,
                            `${Constants.TwitchUri}/${Config.twitch.broadcasterName}`
                        ),
                        icon_url: this.setting(
                            DiscordSettingName.OnlineAuthorIcon,
                            "https://static-cdn.jtvnw.net/jtv_user_pictures/eb7b3231-a3c1-4198-b67e-c53453d3f98f-profile_image-300x300.png"
                        ),
                    },
                },
            ]);
            await this.sendMessage(body);
        }
    }

    /**
     * Send StreamOffline message to Discord webhook;
     */
    public async sendStreamOffline(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        const body = this.createRequestBody(this.setting(DiscordSettingName.OfflineMessage), [
            {
                title: this.setting(
                    DiscordSettingName.OfflineTitle,
                    "Chewie is now offline, check back later to see if he's online!"
                ),
                description: this.setting(DiscordSettingName.OfflineDescription),
                color: this.setting(DiscordSettingName.OfflineColor),
                url: this.setting(DiscordSettingName.OfflineUrl, `${Constants.TwitchUri}/${Config.twitch.broadcasterName}`),
                image: {
                    url: this.setting(DiscordSettingName.OfflineImage),
                },
                author: {
                    name: this.setting(DiscordSettingName.OfflineAuthorName, Config.twitch.broadcasterName),
                    url: this.setting(DiscordSettingName.OfflineAuthorUrl, `${Constants.TwitchUri}/${Config.twitch.broadcasterName}`),
                    icon_url: this.setting(
                        DiscordSettingName.OfflineAuthorIcon,
                        "https://static-cdn.jtvnw.net/jtv_user_pictures/eb7b3231-a3c1-4198-b67e-c53453d3f98f-profile_image-300x300.png"
                    ),
                },
            },
        ]);
        await this.sendMessage(body);
    }

    /**
     * Helper for creating the body for discord webhook request
     * @param message The message text for the discord message
     * @param embed The embed for the discord message
     * @returns
     */
    private createRequestBody(message: string, embed?: any[]): any {
        return {
            content: message,
            username: "ChewieBot",
            embeds: embed,
        };
    }

    /**
     * Sends a message to the discord webhook
     * @param body The body of the request, containing all the details for the message
     */
    private async sendMessage(body: any): Promise<void> {
        const options: AxiosRequestConfig = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        await axios.post(Config.discord.webhookUrl, body, options);
    }

    /**
     * Gets all settings from the database and assigns them to a dictionary so we don't query the database every time.
     * @returns
     */
    private async getAllSettings(): Promise<void> {
        if (this.settings) {
            return;
        }

        const dbSettings = await this.discordRepo.getAll();
        this.settings = Object.assign({}, ...dbSettings.map((setting) => ({ [setting.name]: setting })));
    }

    /**
     * Helper function to get the setting value of a setting from the dictionary.
     * @param settingName The name of the setting to get the value of.
     * @returns The value of the setting in the dictionary or a default string if there is no setting.
     */
    private setting(settingName: DiscordSettingName, defaultValue: string = ""): string {
        if (!this.settings) {
            return defaultValue;
        }

        const returnSetting: IDiscordSetting = this.settings[settingName];
        if (!returnSetting) {
            return defaultValue;
        }

        return returnSetting.value;
    }

    /**
     * Gets a setting from the database.
     * @param setting The name of the setting to get.
     * @returns The setting name and value from the database.
     */
    public async getSetting(setting: DiscordSettingName): Promise<IDiscordSetting> {
        return await this.discordRepo.get(setting);
    }

    /**
     * Adds a setting to the database
     * @param setting The name and value of the setting to add.
     */
    public async addSetting(setting: IDiscordSetting): Promise<void> {
        await this.discordRepo.add(setting);
    }
}
