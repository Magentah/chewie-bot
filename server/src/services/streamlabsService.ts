import { injectable, inject } from "inversify";
import { BotSettingsService, UserService } from "../services";
import Constants from "../constants";
import * as io from "socket.io-client";
import { Logger, LogType } from "../logger";
import RewardService from "../services/rewardService";
import EventLogService from "../services/eventLogService";
import { EventLogType, ProviderType } from "../models";
import DonationsRepository from "../database/donations";
import { BotSettings } from "./botSettingsService";

export enum StreamlabsEvent {
    Donation = "donation",
    Subscription = "subscription",
    Resub = "resub",
    Follow = "follow",
    Host = "host",
    Bits = "bits",
    Raid = "raid",
}

export enum SubType {
    Sub = "sub",
    Resub = "resub",
}

export enum SubscriptionPlan {
    None = "0",
    Prime = "Prime",
    Tier1 = "1000",
    Tier2 = "2000",
    Tier3 = "3000",
}

interface IStreamlabsSocketMessage {
    type: StreamlabsEvent;
    event_id: string;
    message: any;
}

export interface IDonationMessage {
    id: number;
    name: string;
    amount: number;
    formatted_amount: string;
    message: string;
    currency: string;
    emotes: string;
    iconClassName: string;
    to: any;
    from: string;
    from_user_id: string;
    _id: string;
}

export interface ISubscriptionMessage {
    name: string;
    months: number;
    message: string;
    emotes: any;
    sub_plan: SubscriptionPlan;
    sub_type: SubType;
    _id?: string;
}

export interface IResubscriptionMessage {
    amount: number;
    name: string;
    months: number;
    message: string;
    emotes: any;
    sub_plan: SubscriptionPlan;
    streak_months: number;
    _id: string;
}

export interface IBitsMessage {
    amount: number;
    name: string;
    message: string;
    emotes: any;
    _id: string;
}

@injectable()
export class StreamlabsService {
    private websocket!: SocketIOClient.Socket;
    constructor(
        @inject(UserService) private users: UserService,
        @inject(RewardService) private rewards: RewardService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(DonationsRepository) private donations: DonationsRepository,
        @inject(BotSettingsService) private settings: BotSettingsService
    ) {
        // Empty
    }

    public async connectOnStartup(username: string): Promise<void> {
        if (!username) {
            return;
        }

        const user = await this.users.getUserPrincipal(username, ProviderType.Streamlabs);
        if (!user || !user.accessToken) {
            return;
        }

        this.startSocketConnect(user.accessToken);
    }

    public startSocketConnect(socketToken: string): void {
        if (!socketToken) {
            return;
        }
        if (this.websocket && this.websocket.connected) {
            return;
        }

        try {
            Logger.info(LogType.Streamlabs, `Connecting to streamlabs socket with token: ${socketToken}`);
            this.websocket = io(`${Constants.StreamlabsSocketEndpoint}?token=${socketToken}`, {
                transports: ["websocket"],
                reconnection: true,
            });
        } catch (err: any) {
            Logger.err(LogType.Streamlabs, "Error", err);
        }
        this.websocket.on("connect", this.onSocketOpen);
        this.websocket.on("ping", this.onPing);
        this.websocket.on("pong", this.onPong);
        this.websocket.on("event", (event: IStreamlabsSocketMessage) => this.onMessage(event));

        if (!this.websocket.connected) {
            this.websocket.connect();
        }
    }

    public disconnect(): void {
        if (this.websocket && this.websocket.connected) {
            this.websocket.disconnect();
        }
    }

    private onSocketOpen(): void {
        Logger.info(LogType.Streamlabs, "Connected to streamlabs socket.");
    }

    private onPing(): void {
        Logger.debug(LogType.Streamlabs, "Ping received");
    }

    private onPong(): void {
        Logger.debug(LogType.Streamlabs, "Pong Received");
    }

    private onMessage(message: IStreamlabsSocketMessage): void {
        switch (message.type) {
            case StreamlabsEvent.Donation: {
                this.donationReceived(message.message);
                break;
            }
            case StreamlabsEvent.Subscription: {
                this.subscriptionReceived(message.message);
                break;
            }
            case StreamlabsEvent.Bits: {
                this.bitsReceived(message.message);
                break;
            }
            case StreamlabsEvent.Follow:
            case StreamlabsEvent.Host:
            case StreamlabsEvent.Raid:
                break;
        }
    }

    private async bitsReceived(messages: IBitsMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const bits of messages) {
            const user = await this.users.addUser(bits.name);
            this.eventLogService.addStreamlabsEventReceived(user, EventLogType.Bits, bits);

            this.rewards.processBits(bits);
        }
    }

    private async subscriptionReceived(messages: ISubscriptionMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const sub of messages) {
            if (await this.settings.getValue(BotSettings.SubNotificationProvider) === "Streamlabs") {
                const user = await this.users.addUser(sub.name);
                this.eventLogService.addStreamlabsEventReceived(user, EventLogType.Sub, sub);
                await this.rewards.processSub(sub);
            }
        }
    }

    private async donationReceived(messages: IDonationMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const donation of messages) {
            const user = await this.users.getUser(donation.from);
            this.eventLogService.addStreamlabsEventReceived(user ?? donation.from, EventLogType.Donation, donation);
            this.donations.add({ username: donation.name, date: new Date(), message: donation.message, amount: donation.amount, type: "Streamlabs" });

            this.rewards.processDonation(donation);
        }
    }
}

export default StreamlabsService;
