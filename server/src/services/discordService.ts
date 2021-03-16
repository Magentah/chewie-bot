import { injectable } from "inversify";
import * as Config from "../config.json";
import axios, { AxiosRequestConfig } from "axios";

@injectable()
export default class DiscordService {
    private enabled: boolean = Config.discord.enabled;
    constructor() {
        // Empty
    }

    public async sendStreamOnline(): Promise<void> {
        if (!this.enabled) {
            return;
        }
        const body = this.createRequestBody("Chewie is now online!", [
            {
                title: "Go to the stream!",
                color: 1628627,
                url: "https://twitch.tv/chewiemelodies",
                image: {
                    url: "https://panels-images.twitch.tv/panel-67955580-image-71043b75-1783-4a2b-9fa1-5944f0a051d0",
                },
                author: {
                    name: "ChewieMelodies",
                    url: "https://www.twitch.tv/chewiemelodies",
                    icon_url:
                        "https://static-cdn.jtvnw.net/jtv_user_pictures/eb7b3231-a3c1-4198-b67e-c53453d3f98f-profile_image-300x300.png",
                },
            },
        ]);
        await this.sendMessage(body);
    }

    public async sendStreamOffline(): Promise<void> {
        if (!this.enabled) {
            return;
        }

        const body = this.createRequestBody("Chewie is now offline, check back later to see if he's online!", [
            {
                title: "Current offline!",
                color: 13178390,
                url: "https://twitch.tv/chewiemelodies",
                image: {
                    url: "https://panels-images.twitch.tv/panel-67955580-image-71043b75-1783-4a2b-9fa1-5944f0a051d0",
                },
                author: {
                    name: "ChewieMelodies",
                    url: "https://www.twitch.tv/chewiemelodies",
                    icon_url:
                        "https://static-cdn.jtvnw.net/jtv_user_pictures/eb7b3231-a3c1-4198-b67e-c53453d3f98f-profile_image-300x300.png",
                },
            },
        ]);
        await this.sendMessage(body);
    }

    private createRequestBody(message: string, embed?: any[]): any {
        return {
            content: message,
            username: "ChewieBot",
            embeds: embed,
        };
    }

    private async sendMessage(body: any): Promise<void> {
        const options: AxiosRequestConfig = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        await axios.post(Config.discord.webhookUrl, body, options);
    }
}
