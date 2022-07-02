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

@injectable()
export default class TwitchPubSubService {
    private websocket!: WebSocket;
    private heartbeatHandle!: NodeJS.Timeout;

    private readonly HeartbeatInterval: number = 1000 * 60;
    private readonly ReconnectInterval: number = 1000 * 3;

    constructor(
        @inject(UserService) private users: UserService,
        @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(EventLogService) private eventLogService: EventLogService
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

    /**
     * Called when the websocket connection is opened.
     * @param event The open event message from the websocket.
     */
    private onOpen(): void {
        Logger.info(LogType.TwitchPubSub, "Connected to Twitch PubSub service.");
        this.heartbeat();
        this.heartbeatHandle = setInterval(() => this.heartbeat(), this.HeartbeatInterval);
        void this.listen("channel-subscribe-events-v1");
    }

    /**
     * Called when the websocket is closed.
     * @param event The close event message from the websocket.
     */
    private onClose(event: WebSocket.CloseEvent): void {
        Logger.info(LogType.TwitchPubSub, "Connection to Twitch PubSub closed. Reconnecting...", event);
        clearInterval(this.heartbeatHandle);
        setTimeout(() => this.connect(), this.ReconnectInterval);
    }

    /**
     * Called when the websocket receives a message.
     * @param event The message event from the websocket.
     */
    private onMessage(event: WebSocket.MessageEvent): void {
        // For now just log the event.
        if (event.type !== "PONG") {
            if (typeof(event.data) === "string") {
                const data = JSON.parse(event.data) as { topic: string, message: string };
                void this.eventLogService.addDebug(data);
                /* Further processing probably like this.
                    if (data.topic === "channel-subscribe-events-v1") {
                        const message = JSON.parse(data.message) as { data: any };
                        void this.eventLogService.addStreamlabsEventReceived(message.data.user_name, EventLogType.Sub, message);
                    }
                */
            } else {
                Logger.debug(LogType.TwitchPubSub, `Message data type not string but ${typeof(event.data)}`, event);
            }
        }
    }

    /**
     * Called when the websocket receives an error.
     * @param event The error event message from the websocket.
     */
    private onError(event: WebSocket.ErrorEvent): void {
        Logger.err(LogType.TwitchPubSub, "Received error from Twitch PubSub", event);
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
    private async listen(topic: string): Promise<void> {
        Logger.info(LogType.TwitchPubSub, `Listening to topic: ${topic}`);
        const authToken = await this.getBroadcasterOAuth();
        const channelId = await this.getBroadcasterChannelId();
        const message = {
            type: "LISTEN",
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
