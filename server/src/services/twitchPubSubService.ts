import { inject, injectable } from "inversify";
import EventLogService from "./eventLogService";
import TwitchAuthService from "./twitchAuthService";
import UserService from "./userService";
import Constants from "./../constants";
import { CryptoHelper } from "../helpers";
import * as Config from "../config.json";
import { IUserPrincipal, ProviderType } from "../models/userPrincipal";
import { Logger, LogType } from "../logger";
import WebSocket = require("ws");
import { ITwitchPubSubSubscription } from "../models/twitchApi";
import { EventLogType } from "../models/eventLog";
import BotSettingsService from "./botSettingsService";
import RewardService from "./rewardService";

@injectable()
export default class TwitchPubSubService {
    private websocket!: WebSocket;
    private heartbeatHandle!: NodeJS.Timeout;

    private readonly HeartbeatInterval: number = 1000 * 60;
    private readonly ReconnectInterval: number = 1000 * 3;
    private static readonly SubScribeEvent = "channel-subscribe-events-v1";

    constructor(
        @inject(UserService) private users: UserService,
        @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(BotSettingsService) private settings: BotSettingsService,
        @inject(RewardService) private rewardService: RewardService
    ) {
        // Only injection
    }

    /**
     * Connects to the Twitch PubSub service.
     * @returns
     */
    public connect(): void {
        if (this.websocket === undefined) {
            this.websocket = new WebSocket(Constants.TwitchPubSubUrl);
            this.websocket.onopen = () => this.onOpen();
            this.websocket.onclose = (ev: WebSocket.CloseEvent) => this.onClose(ev);
            this.websocket.onmessage = (ev: WebSocket.MessageEvent) => this.onMessage(ev);
            this.websocket.onerror = (ev: WebSocket.ErrorEvent) => this.onError(ev);
        }
    }

    public subscribeEvents(): void {
        void this.listen(TwitchPubSubService.SubScribeEvent, "LISTEN");
    }

    /**
     * Called when the websocket connection is opened.
     * @param event The open event message from the websocket.
     */
    private onOpen(): void {
        Logger.info(LogType.Twitch, "Connected to Twitch PubSub service.");
        this.heartbeat();
        this.heartbeatHandle = setInterval(() => this.heartbeat(), this.HeartbeatInterval);
        this.subscribeEvents();
    }

    /**
     * Called when the websocket is closed.
     * @param event The close event message from the websocket.
     */
    private onClose(event: WebSocket.CloseEvent): void {
        Logger.info(LogType.Twitch, "Connection to Twitch PubSub closed. Reconnecting...", event);
        clearInterval(this.heartbeatHandle);
        setTimeout(() => this.connect(), this.ReconnectInterval);
    }

    /**
     * Called when the websocket receives a message.
     * @param event The message event from the websocket.
     */
    private onMessage(event: WebSocket.MessageEvent): void {
        if (typeof(event.data) === "string") {
            // Type definition of WebSocket.MessageEvent is a bit misleading, not sure what the
            // "type" member is supposed to do since the needed information is in event.data.type and not event.type.
            const msg = JSON.parse(event.data) as { type: string, data: any };

            // Ignore RESPONSE, PONG etc.
            if (msg.type === "MESSAGE") {
                const data = msg.data as { topic: string, message: string };
                if (data.topic.startsWith(TwitchPubSubService.SubScribeEvent)) {
                    this.settings.getSubNotificationProvider().then(value => {
                        if (value === "Twitch") {
                            let type = EventLogType.Sub;
                            const message = JSON.parse(data.message) as ITwitchPubSubSubscription;
                            switch (message.context) {
                                case "resub":
                                    type = EventLogType.Resub;
                                    break;
                                case "subgift":
                                    type = EventLogType.GiftSub;
                                    break;
                            }

                            void this.eventLogService.addStreamlabsEventReceived(message.user_name, type, message);

                            // In case of sub gift, only gifter will receive points etc.
                            // Exception T3 sub, here gifter and recipient will get perks through IRC events,
                            // so we only need to take care of actual sub events here.
                            if (!message.is_gift) {
                                void this.rewardService.processSub({
                                    sub_plan: message.sub_plan,
                                    message: message.sub_message.message,
                                    months: message.cumulative_months,
                                    sub_type: message.context,
                                    emotes: message.sub_message.emotes,
                                    name: message.user_name
                                });
                            }
                        } else {
                            Logger.debug(LogType.Twitch, "PubSub subscribe event not enabled", data);
                        }
                    }).catch(x => {
                        Logger.err(LogType.Twitch, "Error calling getSubNotificationProvider()", x);
                    });
                } else {
                    Logger.debug(LogType.Twitch, `Received PubSub message with topic  ${data.topic}`, data);
                }
            } else {
                Logger.debug(LogType.Twitch, `Received PubSub message of type ${msg.type}`, msg);
            }
        } else {
            Logger.debug(LogType.Twitch, `Message data type not string but ${typeof(event.data)}`, event);
        }
    }

    /**
     * Called when the websocket receives an error.
     * @param event The error event message from the websocket.
     */
    private onError(event: WebSocket.ErrorEvent): void {
        Logger.err(LogType.Twitch, "Received error from Twitch PubSub", event);
    }

    /**
     * PING message to send to the Twitch PubSub service.
     */
    private heartbeat(): void {
        const message = {
            type: "PING",
        };
        this.sendMessage(message);
    }

    /**
     * Function that wraps sending a message to the websocket. Data is sent with JSON.stringify
     * @param data The data to send to the websocket.
     * @returns
     */
    private sendMessage(data: any): void {
        if (!this.websocket) return;
        this.websocket.send(JSON.stringify(data));
    }

    /**
     * Helper function to send a listen message for a specific Twitch PubSub topic. Only handles topics that are postfixed with the channel id only
     * @param topic The topic to listen to.
     */
    private async listen(topic: string, type: "LISTEN" | "UNLISTEN"): Promise<void> {
        Logger.info(LogType.Twitch, `Listening to topic: ${topic}`);
        const authToken = await this.getBroadcasterOAuth();
        const channelId = await this.getBroadcasterChannelId();
        const message = {
            type,
            nonce: CryptoHelper.generateNonce(),
            data: {
                topics: [`${topic}.${channelId}`],
                auth_token: authToken,
            },
        };
        this.sendMessage(message);
    }

    /**
     * Helper function to get the broadcaster channel id. Used for Listen messages.
     * @returns The broadcaster twitch id.
     */
    private async getBroadcasterChannelId(): Promise<number | undefined> {
        const broadcaster = await this.users.getBroadcaster();
        if (!broadcaster) return undefined;
        return broadcaster.twitchUserProfile?.id;
    }

    /**
     * Helper function to get the broadcaster oauth token. Used for listen messages.
     * @returns The broadcasters oauth token.
     */
    private async getBroadcasterOAuth(): Promise<string> {
        const broadcaster: IUserPrincipal | undefined = await this.users.getUserPrincipal(Config.twitch.broadcasterName, ProviderType.Twitch);
        if (!broadcaster) return "";

        const auth = await this.authService.getUserAccessToken(broadcaster);
        return auth.accessToken.token;
    }
}
