import * as tmi from 'tmi.js';
import { inject, injectable } from 'inversify';
import OAuthService from './oauthService';
import { Logger } from '@overnightjs/logger';
import * as config from './../config.json';

@injectable()
class TwitchService {
    private client: tmi.Client;
    private options: tmi.Options;

    constructor(@inject(OAuthService) private oauthService: OAuthService) {
        this.options = this.setupOptions();
        this.client = tmi.Client(this.options);
    }

    private setupOptions(): tmi.Options {
        return {
            options: {
                debug: true,
            },
            connection: {
                reconnect: true,
                secure: true,
            },
            identity: {
                username: config.twitch.username,
                password: `${config.twitch.oauth}`,
            },
            channels: [ `#${config.twitch.username}` ],
        };
    }

    private setupEventHandlers(): void {
        this.client.on('action', this.actionEventHandler);
        this.client.on('anongiftpaidupgrade', this.anonGiftPaidUpgradeEventHandler);
        this.client.on('ban', this.banEventHandler);
        this.client.on('chat', this.chatEventHandler);
        this.client.on('cheer', this.cheerEventHandler);
        this.client.on('clearchat', this.clearChatEventHandler);
        this.client.on('connected', this.connectedEventHandler);
        this.client.on('connecting', this.connectingEventHandler);
        this.client.on('disconnected', this.disconnectedEventHandler);
        this.client.on('emoteonly', this.emoteOnlyEventHandler);
        this.client.on('emotesets', this.emoteSetsEventHandler);
        this.client.on('followersonly', this.followersOnlyEventHandler);
        this.client.on('giftpaidupgrade', this.giftPaidUpgradeEventHandler);
        this.client.on('hosted', this.hostedEventHandler);
        this.client.on('hosting', this.hostingEventHandler);
        this.client.on('join', this.joinEventHandler);
        this.client.on('logon', this.logonEventHandler);
        // this.client.on('message', channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) combines chat, whisper and action events
        this.client.on('messagedeleted', this.messageDeletedEventHandler);
        this.client.on('mod', this.modEventHandler);
        this.client.on('mods', this.modsEventHandler);
        this.client.on('notice', this.noticeEventHandler);
        this.client.on('part', this.partEventHandler);
        this.client.on('ping', this.pingEventHandler);
        this.client.on('pong', this.pongEventHandler);
        this.client.on('r9kbeta', this.r9kBetaEventHandler);
        this.client.on('raided', this.raidedEventHandler);
        // this.client.on('raw_message', (messageCloned: { [property: string]: any; }, message: { [property: string]: any; }) => {}); raw messages, probably never actually needed
        this.client.on('reconnect', this.reconnectEventHandler);
        this.client.on('resub', this.resubEventHandler);
        this.client.on('roomstate', this.roomStateEventHandler);
        this.client.on('serverchange', this.serverChangeEventHandler);
        this.client.on('slowmode', this.slowModeEventHandler);
        this.client.on('subgift', this.subGiftEventHandler);
        this.client.on('submysterygift', this.subMysteryGiftEventHandler);
        this.client.on('subscribers', this.subscribersEventHandler);
        this.client.on('subscription', this.subscriptionEventHandler);
        this.client.on('timeout', this.timeoutEventHandler);
        this.client.on('unhost', this.unhostEventHandler);
        this.client.on('unmod', this.unmodEventHandler);
        this.client.on('vips', this.vipsEventHandler);
        this.client.on('whisper', this.whisperEventHandler);
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
        Logger.Info(`Chat event: ${channel}:${userstate.username} -- ${message}`);
    }

    private cheerEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string) {
        // Empty
    }

    private clearChatEventHandler(channel: string) {
        // Empty
    }

    private connectedEventHandler(address: string, port: number) {
        // Empty
    }

    private connectingEventHandler(address: string, port: number) {
        // Empty
    }

    private disconnectedEventHandler(reason: string) {
        // Empty
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

    private subGiftEventHandler(channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, userstate: tmi.SubGiftUserstate) {
        // Empty
    }

    private subMysteryGiftEventHandler(channel: string, username: string, numbOfSubs: number, methods: tmi.SubMethods, userstate: tmi.SubMysteryGiftUserstate) {
        // Empty
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
        // Empty
    }

    public connect(): void {
        Logger.Info('Connecting to Twitch.tv with tmi.js');
        this.client.connect();
    }

    public disconnect(): void {
        Logger.Info('Disconnecting from Twitch.tv');
        this.client.disconnect();
    }
}

export default TwitchService;
