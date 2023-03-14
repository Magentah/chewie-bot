import { inject, injectable } from "inversify";
import * as tmi from "tmi.js";
import { Logger, LogType } from "../logger";
import { IServiceResponse, ResponseStatus, SocketMessageType } from "../models";
import { Response } from "../helpers";
import * as Config from "../config.json";
// Required to do it this way instead of from "../services" due to inversify breaking otherwise
import UserService from "../services/userService";
import WebsocketService from "../services/websocketService";
import BotSettingsService, { BotSettings } from "../services/botSettingsService";
import TwitchAuthService from "../services/twitchAuthService";
import EventLogService from "./eventLogService";

export interface IBotTwitchStatus {
    connected: boolean;
}

export type TwitchServiceProvider = () => Promise<TwitchService>;

/**
 * Service for interacting with Twitch IRC.
 */
@injectable()
export class TwitchService {
    private client!: tmi.Client;
    public hasInitialized = false;
    private channel: string;
    private activeChatters: string[] = [];
    private commandCallback!: (channel: string, username: string, message: string) => Promise<void>;
    private giftSubCallback!: (username: string, recipient: string, giftedMonths: number, plan: string | undefined) => Promise<void>;
    private subMysteryGiftCallback!: (username: string, giftedSubs: number, plan: string | undefined) => Promise<void>;

    constructor(
        @inject(UserService) private users: UserService,
        @inject(WebsocketService) private websocketService: WebsocketService,
        @inject(BotSettingsService) private botSettingsService: BotSettingsService,
        @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(EventLogService) private eventLogService: EventLogService,
    ) {
        this.channel = `#${Config.twitch.broadcasterName}`;
    }

    public async initialize(): Promise<IServiceResponse> {
        if (this.hasInitialized) {
            this.hasInitialized = false;
            Logger.warn(LogType.Twitch, `Twitch Bot reinitializing. Current client ${this.client.getOptions().identity?.username} being overwritten.`);

            if (this.client.readyState() !== "CLOSED") {
                const response = await this.disconnect();
                if (response.status === ResponseStatus.Error) {
                    return response;
                }
            }
        }

        const options = await this.setupOptions();
        if (options.identity?.username && options.identity.password) {
            this.client = tmi.client(options);
            this.setupEventHandlers(this.client);
            this.hasInitialized = true;

            return Response.Success();
        }

        return Response.Error("No valid bot username or oauth key.");
    }

    public triggerAlert(alertType: string, variation: string, imageUrl: string) {
        switch (alertType) {
            case "redeem": {
                this.websocketService.send({
                    type: SocketMessageType.AlertTriggered,
                    message: `Redeem ${variation} alert triggered.`,
                    data: { href: imageUrl },
                });
                break;
            }
            default:
                break;
        }
    }

    public setCommandCallback(callback: (channel: string, username: string, message: string) => Promise<void>) {
        this.commandCallback = callback;
    }

    public setAddGiftCallback(callback: (username: string, recipient: string, giftedMonths: number, plan: string | undefined) => Promise<void>) {
        this.giftSubCallback = callback;
    }

    public setSubMysteryGiftCallback(callback: (username: string, giftedSubs: number, plan: string | undefined) => Promise<void>) {
        this.subMysteryGiftCallback = callback;
    }

    public async sendMessage(channel: string, message: string): Promise<IServiceResponse> {
        try {
            await this.client.say(channel, message);
            return Response.Success();
        } catch (error: any) {
            Logger.warn(LogType.Twitch, error);
            return Response.Error(undefined, error);
        }
    }

    public async joinChannel(channel: string): Promise<IServiceResponse> {
        try {
            Logger.info(LogType.Twitch, `Bot joined channel ${channel}`);
            await this.client.join(channel);
            return Response.Success();
        } catch (error: any) {
            Logger.warn(LogType.Twitch, error);
            return Response.Error(undefined, error);
        }
    }

    public async leaveChannel(channel: string): Promise<IServiceResponse> {
        try {
            Logger.info(LogType.Twitch, `Bot left channel ${channel}`);
            await this.client.part(channel);
            return Response.Success();
        } catch (error: any) {
            Logger.warn(LogType.Twitch, error);
            return Response.Error(undefined, error);
        }
    }

    public getStatus(): IServiceResponse {
        try {
            return Response.Success(undefined, { state: this.client.readyState() });
        } catch (error) {
            return Response.Error(undefined, error);
        }
    }

    /**
     * Gets the list of active chatters (posted a message since start of stream).
     */
    public getActiveChatters(): string[] {
        return this.activeChatters;
    }

    public clearActiveChatters() {
        this.activeChatters = [];
    }

    private async setupOptions(): Promise<tmi.Options> {
        try {
            const botUser = await this.botSettingsService.getSettings(BotSettings.BotUsername);
            const botUserAuth = await this.botSettingsService.getSettings(BotSettings.BotUserAuth);

            return {
                options: {
                    debug: true,
                },
                connection: {
                    reconnect: true,
                    secure: true,
                },
                identity: {
                    username: botUser.value,
                    password: botUserAuth.value,
                },
            };
        } catch (error) {
            return {
                options: {
                    debug: true,
                },
                connection: {
                    reconnect: true,
                    secure: true,
                },
                identity: {
                    username: "",
                    password: "",
                },
            };
        }
    }

    private setupEventHandlers(client: tmi.Client): void {
        // If we don't use arrow functions here, TS breaks because 'this' is redefined, so none of the service properties are available.
        client.on("action", (channel, userstate, message, self) => this.actionEventHandler(channel, userstate, message, self));
        client.on("anongiftpaidupgrade", (channel, username, userstate) => this.anonGiftPaidUpgradeEventHandler(channel, username, userstate));
        client.on("ban", (channel, username, reason) => this.banEventHandler(channel, username, reason));
        client.on("chat", (channel, userstate, message, self) => this.chatEventHandler(channel, userstate, message, self));
        client.on("cheer", (channel, userstate, message) => this.cheerEventHandler(channel, userstate, message));
        client.on("clearchat", (channel) => this.clearChatEventHandler(channel));
        client.on("connected", (address, port) => this.connectedEventHandler(address, port));
        client.on("connecting", (address, port) => this.connectingEventHandler(address, port));
        client.on("disconnected", (reason) => this.disconnectedEventHandler(reason));
        client.on("emoteonly", (channel, enabled) => this.emoteOnlyEventHandler(channel, enabled));
        client.on("emotesets", (sets, objs) => this.emoteSetsEventHandler(sets, objs));
        client.on("followersonly", (channel, enabled, length) => this.followersOnlyEventHandler(channel, enabled, length));
        client.on("giftpaidupgrade", (channel, username, sender, userstate) => this.giftPaidUpgradeEventHandler(channel, username, sender, userstate));
        client.on("hosted", (channel, username, viewers, autohost) => this.hostedEventHandler(channel, username, viewers, autohost));
        client.on("hosting", (channel, target, viewers) => this.hostingEventHandler(channel, target, viewers));
        client.on("join", (channel, username, self) => this.joinEventHandler(channel, username, self));
        client.on("logon", () => this.logonEventHandler());
        // this.client.on('message', channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) combines chat, whisper and action events
        client.on("messagedeleted", (channel, username, deletedMessage, userstate) =>
            this.messageDeletedEventHandler(channel, username, deletedMessage, userstate)
        );
        client.on("mod", (channel, username) => this.modEventHandler(channel, username));
        client.on("mods", (channel, mods) => this.modsEventHandler(channel, mods));
        client.on("notice", (channel, msgid, message) => this.noticeEventHandler(channel, msgid, message));
        client.on("part", (channel, username, self) => this.partEventHandler(channel, username, self));
        client.on("ping", () => this.pingEventHandler());
        client.on("pong", (latency) => this.pongEventHandler(latency));
        client.on("r9kbeta", (channel, enabled) => this.r9kBetaEventHandler(channel, enabled));
        client.on("raided", (channel, username, viewers) => this.raidedEventHandler(channel, username, viewers));
        // this.client.on('raw_message', (messageCloned: { [property: string]: any; }, message: { [property: string]: any; }) => {}); raw messages, probably never actually needed
        client.on("reconnect", () => this.reconnectEventHandler());
        client.on("resub", (channel, username, months, message, userstate, methods) =>
            this.resubEventHandler(channel, username, months, message, userstate, methods)
        );
        client.on("roomstate", (channel, state) => this.roomStateEventHandler(channel, state));
        client.on("serverchange", (channel) => this.serverChangeEventHandler(channel));
        client.on("slowmode", (channel, enabled, length) => this.slowModeEventHandler(channel, enabled, length));
        client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) =>
            this.subGiftEventHandler(channel, username, streakMonths, recipient, methods, userstate)
        );
        client.on("submysterygift", (channel, username, numOfSubs, methods, userstate) =>
            this.subMysteryGiftEventHandler(channel, username, numOfSubs, methods, userstate)
        );
        client.on("subscribers", (channel, enabled) => this.subscribersEventHandler(channel, enabled));
        client.on("subscription", (channel, username, methods, message, userstate) =>
            this.subscriptionEventHandler(channel, username, methods, message, userstate)
        );
        client.on("timeout", (channel, username, reason, duration) => this.timeoutEventHandler(channel, username, reason, duration));
        client.on("unhost", (channel, viewers) => this.unhostEventHandler(channel, viewers));
        client.on("unmod", (channel, username) => this.unmodEventHandler(channel, username));
        client.on("vips", (channel, vips) => this.vipsEventHandler(channel, vips));
        client.on("whisper", (from, userstate, message, self) => this.whisperEventHandler(from, userstate, message, self));
    }

    private actionEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        // Empty
    }

    private anonGiftPaidUpgradeEventHandler(channel: string, username: string, userstate: tmi.AnonSubGiftUpgradeUserstate) {
        // Empty
    }

    private banEventHandler(channel: string, username: string, reason: string) {
        // Empty
    }

    private chatEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        if (self) {
            return;
        }

        const username = userstate.username ?? "";
        if (this.activeChatters.indexOf(username) === -1) {
            this.activeChatters.push(username);
        }

        void this.handleCommand(channel, username, message);
    }

    public async invokeCommand(username: string, message: string) {
        await this.handleCommand(this.channel, username ?? "", message);
    }

    private async handleCommand(channel: string, username: string, message: string) {
        if (this.commandCallback) {
            await this.commandCallback(channel, username, message);
        }
    }

    private cheerEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string) {
        // Empty
    }

    private clearChatEventHandler(channel: string) {
        // Empty
    }

    private connectedEventHandler(address: string, port: number) {
        Logger.info(LogType.Twitch, `Connected to Twitch.tv service.`, { address, port });
        this.websocketService.send({
            type: SocketMessageType.BotConnected,
            message: "Bot connected to twitch server.",
            data: { address, port },
        });
    }

    private connectingEventHandler(address: string, port: number) {
        // Empty
    }

    private disconnectedEventHandler(reason: string) {
        Logger.info(LogType.Twitch, "Disconnected from Twitch.tv service.", { reason });
        this.websocketService.send({
            type: SocketMessageType.BotDisconnected,
            message: "Bot connected to twitch server.",
            data: { reason },
        });
    }

    private emoteOnlyEventHandler(channel: string, enabled: boolean) {
        // Empty
    }

    private emoteSetsEventHandler(sets: string, obj: tmi.EmoteObj) {
        // Empty
    }

    private followersOnlyEventHandler(channel: string, enabled: boolean, length: number) {
        // Empty
    }

    private giftPaidUpgradeEventHandler(channel: string, username: string, sender: string, userstate: tmi.SubGiftUpgradeUserstate) {
        // Empty
    }

    private hostedEventHandler(channel: string, username: string, viewers: number, autohost: boolean) {
        // Empty
    }

    private hostingEventHandler(channel: string, target: string, viewers: number) {
        // Empty
    }

    private joinEventHandler(channel: string, username: string, self: boolean) {
        // Empty
    }

    private logonEventHandler() {
        // Empty
    }

    private messageDeletedEventHandler(channel: string, username: string, deletedMessage: string, userstate: tmi.DeleteUserstate) {
        // Empty
    }

    private modEventHandler(channel: string, username: string) {
        // Empty
    }

    private modsEventHandler(channel: string, mods: string[]) {
        // Empty
    }

    private noticeEventHandler(channel: string, msgid: tmi.MsgID, message: string) {
        // Empty
    }

    private partEventHandler(channel: string, username: string, self: boolean) {
        // Empty
    }

    private pingEventHandler() {
        // Empty
    }

    private pongEventHandler(latency: number) {
        // Empty
    }

    private r9kBetaEventHandler(channel: string, enabled: boolean) {
        // Empty
    }

    private raidedEventHandler(channel: string, username: string, viewers: number) {
        // Empty
    }

    private reconnectEventHandler() {
        // Empty
    }

    private resubEventHandler(channel: string, username: string, months: number, message: string, userstate: tmi.SubUserstate, methods: tmi.SubMethods) {
        // Empty
    }

    private roomStateEventHandler(channel: string, state: tmi.RoomState) {
        // Empty
    }

    private serverChangeEventHandler(channel: string) {
        // Empty
    }

    private slowModeEventHandler(channel: string, enabled: boolean, length: number) {
        // Empty
    }

    private async subGiftEventHandler(
        channel: string,
        username: string,
        streakMonths: number,
        recipient: string,
        methods: tmi.SubMethods,
        userstate: tmi.SubGiftUserstate
    ) {
        // userstate.login should contain the plain (non international) username.
        const actualUser = userstate.login ?? username;
        const user = await this.users.addUser(actualUser);
        await this.eventLogService.addTwitchGiftSub(user, { channel, streakMonths, recipient, methods, userstate });

        if (this.giftSubCallback) {
            await this.giftSubCallback(actualUser, recipient, userstate["msg-param-gift-months"], methods.plan);
        }
    }

    /**
     * This event will occur additionally to the individual "subgift" events. So 10 subs gifted to the community will result in one
     * "submysterygift" and 10 "subgift" events.
     */
    private async subMysteryGiftEventHandler(channel: string, username: string, numbOfSubs: number, methods: tmi.SubMethods, userstate: tmi.SubMysteryGiftUserstate) {
        const user = await this.users.addUser(username);
        await this.eventLogService.addTwitchCommunityGiftSub(user, { channel, numbOfSubs, methods, userstate });

        if (this.subMysteryGiftCallback) {
            await this.subMysteryGiftCallback(username, numbOfSubs, methods.plan);
        }
    }

    private subscribersEventHandler(channel: string, enabled: boolean) {
        // Empty
    }

    private subscriptionEventHandler(channel: string, username: string, methods: tmi.SubMethods, message: string, userstate: tmi.SubUserstate) {
        // Empty
    }

    private timeoutEventHandler(channel: string, username: string, reason: string, duration: number) {
        // Empty
    }

    private unhostEventHandler(channel: string, viewers: number) {
        // Empty
    }

    private unmodEventHandler(channel: string, username: string) {
        // Empty
    }

    private vipsEventHandler(channel: string, vips: string[]) {
        // Empty
    }

    private whisperEventHandler(from: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        Logger.info(LogType.Twitch, `Whisper event: ${from}:${userstate.username} -- ${message}`);

        if (self) {
            return;
        }

        this.commandCallback("", userstate.username ?? "", message);
    }

    public async connect(): Promise<IServiceResponse> {
        if (this.hasInitialized) {
            Logger.info(LogType.Twitch, "Connecting to Twitch.tv with tmi.js");

            // Do not connect more than once.
            if (this.client.readyState() === "OPEN") {
                return Response.Success();
            }

            try {
                await this.client.connect();
                if (this.channel) {
                    return await this.joinChannel(this.channel);
                }
                return Response.Success();
            } catch (error: any) {
                Logger.err(LogType.Twitch, error);
                return Response.Error(undefined, error);
            }
        } else {
            Logger.warn(LogType.Twitch, "Attempted to connect to Twitch.tv without having username and oauth set.");
            return Response.Error();
        }
    }

    public async disconnect(): Promise<IServiceResponse> {
        if (this.client.readyState() === "OPEN") {
            Logger.info(LogType.Twitch, "Disconnecting from Twitch.tv");
            try {
                await this.client.disconnect();
                return Response.Success();
            } catch (error: any) {
                Logger.err(LogType.Twitch, error);
                return Response.Error(undefined, error);
            }
        } else {
            Logger.warn(LogType.Twitch, "Attempted to disconnect from Twitch.tv when client is not connected.");
            return Response.Error();
        }
    }
}

export default TwitchService;
