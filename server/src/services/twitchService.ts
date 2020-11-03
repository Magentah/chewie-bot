import axios from "axios";
import { inject, injectable } from "inversify";
import * as tmi from "tmi.js";
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";
import { ITwitchChatList, SocketMessageType } from "../models";

// Required to do it this way instead of from "../services" due to inversify breaking otherwise
import CommandService from "../services/commandService";
import UserService from "../services/userService";
import WebsocketService from "../services/websocketService";

export interface IBotTwitchStatus {
    connected: boolean;
}

@injectable()
export class TwitchService {
    private client: tmi.Client;
    private options: tmi.Options;
    private channelUserList: Map<string, ITwitchChatList>;

    constructor(
        @inject(CommandService) private commandService: CommandService,
        @inject(UserService) private users: UserService,
        @inject(WebsocketService) private websocketService: WebsocketService
    ) {
        this.channelUserList = new Map<string, ITwitchChatList>();
        this.options = this.setupOptions(Config.twitch.username, Config.twitch.oauth, Config.twitch.username);
        this.client = tmi.Client(this.options);
        this.setupEventHandlers(this.client);
    }

    public sendMessage(channel: string, message: string): void {
        this.client.say(channel, message);
    }

    public joinChannel(channel: string): void {
        Logger.info(LogType.Twitch, `Bot joined channel ${channel}`);
        this.client.join(channel);
    }

    public leaveChannel(channel: string): void {
        Logger.info(LogType.Twitch, `Bot left channel ${channel}`);
        this.client.part(channel);
    }

    public getStatus(): string {
        return this.client.readyState();
    }

    /**
     * Get the chat list for a channel.
     * @param channel The channel name to get the chat list for.
     */
    private async getChatList(channel: string): Promise<void> {
        // https://tmi.twitch.tv/group/user/:channel_name/chatters

        const { data } = await axios.get(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
        Logger.info(LogType.Twitch, `GetChatList: ${data}`);
        this.channelUserList.set(channel, data);
        this.users.addUsersFromChatList(data);
    }

    private setupOptions(username: string, password: string, channel: string): tmi.Options {
        return {
            options: {
                debug: true,
            },
            connection: {
                reconnect: true,
                secure: true,
            },
            identity: {
                username,
                password,
            },
        };
    }

    private setupEventHandlers(client: tmi.Client): void {
        // If we don't use arrow functions here, TS breaks because 'this' is redefined, so none of the service properties are available.
        client.on("action", (channel, userstate, message, self) =>
            this.actionEventHandler(channel, userstate, message, self)
        );
        client.on("anongiftpaidupgrade", (channel, username, userstate) =>
            this.anonGiftPaidUpgradeEventHandler(channel, username, userstate)
        );
        client.on("ban", (channel, username, reason) => this.banEventHandler(channel, username, reason));
        client.on("chat", (channel, userstate, message, self) =>
            this.chatEventHandler(channel, userstate, message, self)
        );
        client.on("cheer", (channel, userstate, message) => this.cheerEventHandler(channel, userstate, message));
        client.on("clearchat", (channel) => this.clearChatEventHandler(channel));
        client.on("connected", (address, port) => this.connectedEventHandler(address, port));
        client.on("connecting", (address, port) => this.connectingEventHandler(address, port));
        client.on("disconnected", (reason) => this.disconnectedEventHandler(reason));
        client.on("emoteonly", (channel, enabled) => this.emoteOnlyEventHandler(channel, enabled));
        client.on("emotesets", (sets, objs) => this.emoteSetsEventHandler(sets, objs));
        client.on("followersonly", (channel, enabled, length) =>
            this.followersOnlyEventHandler(channel, enabled, length)
        );
        client.on("giftpaidupgrade", (channel, username, sender, userstate) =>
            this.giftPaidUpgradeEventHandler(channel, username, sender, userstate)
        );
        client.on("hosted", (channel, username, viewers, autohost) =>
            this.hostedEventHandler(channel, username, viewers, autohost)
        );
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
        client.on("timeout", (channel, username, reason, duration) =>
            this.timeoutEventHandler(channel, username, reason, duration)
        );
        client.on("unhost", (channel, viewers) => this.unhostEventHandler(channel, viewers));
        client.on("unmod", (channel, username) => this.unmodEventHandler(channel, username));
        client.on("vips", (channel, vips) => this.vipsEventHandler(channel, vips));
        client.on("whisper", (from, userstate, message, self) =>
            this.whisperEventHandler(from, userstate, message, self)
        );
    }

    private actionEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        // Empty
    }

    private anonGiftPaidUpgradeEventHandler(
        channel: string,
        username: string,
        userstate: tmi.AnonSubGiftUpgradeUserstate
    ) {
        // Empty
    }

    private banEventHandler(channel: string, username: string, reason: string) {
        // Empty
    }

    private async chatEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        Logger.info(LogType.Twitch, `Chat event: ${channel}:${userstate.username} -- ${message}`);

        if (self) {
            return;
        }

        this.commandService.handleMessage(channel, userstate.username ?? "", message);
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

    private giftPaidUpgradeEventHandler(
        channel: string,
        username: string,
        sender: string,
        userstate: tmi.SubGiftUpgradeUserstate
    ) {
        // Empty
    }

    private hostedEventHandler(channel: string, username: string, viewers: number, autohost: boolean) {
        // Empty
    }

    private hostingEventHandler(channel: string, target: string, viewers: number) {
        // Empty
    }

    private joinEventHandler(channel: string, username: string, self: boolean) {
        Logger.info(LogType.Twitch, `Channel:: ${channel} - JOIN:: ${username}`);
        if (self) {
            this.getChatList(channel);
            this.sendMessage(channel, `${username} joined!`);
        }
    }

    private logonEventHandler() {
        // Empty
    }

    private messageDeletedEventHandler(
        channel: string,
        username: string,
        deletedMessage: string,
        userstate: tmi.DeleteUserstate
    ) {
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
        Logger.info(LogType.Twitch, `PART:: ${username}`);
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

    private resubEventHandler(
        channel: string,
        username: string,
        months: number,
        message: string,
        userstate: tmi.SubUserstate,
        methods: tmi.SubMethods
    ) {
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

    private subGiftEventHandler(
        channel: string,
        username: string,
        streakMonths: number,
        recipient: string,
        methods: tmi.SubMethods,
        userstate: tmi.SubGiftUserstate
    ) {
        // Empty
    }

    private subMysteryGiftEventHandler(
        channel: string,
        username: string,
        numbOfSubs: number,
        methods: tmi.SubMethods,
        userstate: tmi.SubMysteryGiftUserstate
    ) {
        // Empty
    }

    private subscribersEventHandler(channel: string, enabled: boolean) {
        // Empty
    }

    private subscriptionEventHandler(
        channel: string,
        username: string,
        methods: tmi.SubMethods,
        message: string,
        userstate: tmi.SubUserstate
    ) {
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
        // Empty
    }

    public connect(): void {
        Logger.info(LogType.Twitch, "Connecting to Twitch.tv with tmi.js");
        this.client.connect();
    }

    public disconnect(): void {
        Logger.info(LogType.Twitch, "Disconnecting from Twitch.tv");
        this.client.disconnect();
    }
}

export default TwitchService;
