import { injectable, inject } from "inversify";
import { UserService } from "../services";
import { ITwitchProfile } from "../strategy/twitchStrategy";
import Constants from "../constants";
import * as io from "socket.io-client";
import { Logger, LogType } from "../logger";
import DonationService from "../services/donationService";

export enum StreamlabsEvent {
    Donation = "donation",
    Subscription = "subscription",
    Follow = "follow",
    Host = "host",
    Bits = "bits",
    Raid = "raid",
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

@injectable()
export class StreamlabsService {
    private websocket!: SocketIOClient.Socket;
    constructor(@inject(UserService) private users: UserService,
                @inject(DonationService) private donations: DonationService) {
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
            default: {
                break;
            }
        }
    }

    private donationReceived(messages: IDonationMessage[]): void {
        Logger.info(LogType.Streamlabs, JSON.stringify(messages));

        for (const donation of messages) {
            this.donations.processDonation(donation);
        }
    }
}

export default StreamlabsService;
