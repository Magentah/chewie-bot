import { injectable, inject } from "inversify";
import { UserService } from "../services";
import { ITwitchProfile } from "../strategy/twitchStrategy";
import Constants from "../constants";
import * as io from "socket.io-client";
import { Logger, LogType } from "../logger";
import RewardService from "../services/rewardService";
import EventLogService from "../services/eventLogService";
import { EventLogType } from "../models";

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
    Resub = "resub"
}

export enum SubscriptionPlan {
    None = "0",
    Prime = "1",
    Tier1 = "1000",
    Tier2 = "2000",
    Tier3 = "3000"
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
    formattedAmount: string;
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
    name: string,
    months: number,
    message: string,
    emotes: any,
    sub_plan: SubscriptionPlan,
    sub_type: SubType,
    _id: string
}

export interface IResubscriptionMessage {
    amount: number,
    name: string,
    months: number,
    message: string,
    emotes: any,
    sub_plan: SubscriptionPlan,
    streak_months: number,
    _id: string
}

export interface IBitsMessage {
    amount: number,
    name: string,
    message: string,
    emotes: any,
    _id: string
}

@injectable()
export class StreamlabsService {
    private websocket!: SocketIOClient.Socket;
    constructor(@inject(UserService) private users: UserService,
                @inject(RewardService) private rewards: RewardService,
                @inject(EventLogService) private eventLogService: EventLogService) {
        // Empty
    }

    public async connectOnStartup(sessionUser?: ITwitchProfile): Promise<void> {
        if (!sessionUser) {
            return;
        }

        const user = await this.users.getUser(sessionUser.username);
        if (!user || !user.streamlabsSocketToken) {
            return;
        }

        this.startSocketConnect(user.streamlabsSocketToken);
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
        } catch (err) {
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
        Logger.info(LogType.Streamlabs, "Ping received");
    }

    private onPong(): void {
        Logger.info(LogType.Streamlabs, "Pong Received");
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
            case StreamlabsEvent.Resub: {
                this.resubscriptionReceived(message.message);
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

            default: {
                // For the time being, record any events that are unknown. Maybe there are messages for gift subs?
                this.eventLogService.addStreamlabsEventReceived("(Unknown)", EventLogType.Streamlabs, message);
                break;
            }
        }
    }

    private bitsReceived(messages: IBitsMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const bits of messages) {
            this.eventLogService.addStreamlabsEventReceived(bits.name, EventLogType.Bits, bits);

            this.rewards.processBits(bits);
        }
    }

    private resubscriptionReceived(messages: IResubscriptionMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const sub of messages) {
            this.eventLogService.addStreamlabsEventReceived(sub.name, EventLogType.Resub, sub);

            const subMessage: ISubscriptionMessage = {
                ...sub,
                sub_type: SubType.Resub
            };

            this.rewards.processSub(subMessage);
        }
    }

    private subscriptionReceived(messages: ISubscriptionMessage[]) {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const sub of messages) {
            this.eventLogService.addStreamlabsEventReceived(sub.name, EventLogType.Sub, sub);

            this.rewards.processSub(sub);
        }
    }

    private donationReceived(messages: IDonationMessage[]): void {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const donation of messages) {
            this.eventLogService.addStreamlabsEventReceived(donation.from, EventLogType.Donation, donation);

            this.rewards.processDonation(donation);
        }
    }
}

export default StreamlabsService;
