import axios, { AxiosRequestConfig } from "axios";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import * as Config from "../config.json";
import Constants from "../constants";
import * as moment from "moment";
import { StatusCodes } from "http-status-codes";

interface ISubscriptionData {
    id?: string;
    status?: string;
    type: string;
    version: string;
    condition: ISubscriptionCondition;
    transport: ISubscriptionTransport;
    createdAt?: Date;
}

interface ISubscriptionResponse extends ISubscriptionData {
    status: string;
    id: string;
    created_at: string;
}

interface ISubscriptionCondition {
    broadcaster_user_id: string;
}

interface ISubscriptionTransport {
    method: string;
    callback: string;
    secret: string;
}

interface IAccessToken {
    token: string;
    expiry: number;
}

interface IEventSubNotification {
    subscription: ISubscriptionData;
    event: any;
}

enum EventTypes {
    StreamOnline = "stream.online",
    StreamOffline = "stream.offline",
    ChannelUpdate = "channel.update",
    ChannelFollow = "channel.follow",
    ChannelSubscribe = "channel.subscribe",
    ChannelChear = "channel.cheer",
    ChannelRaid = "channel.raid",
    ChannelBan = "channel.ban",
    ChannelUnban = "channel.unban",
    ChannelModeratorAdd = "channel.moderator.add",
    ChannelModeratorRemove = "channel.moderator.remove",
    ChannelPointsRewardAdd = "channel.channel_points_custom_reward.add",
    ChannelPointsRewardUpdate = "channel.channel_points_custom_reward.update",
    ChannelPointsRewardRemove = "channel.channel_points_custom_reward.remove",
    ChannelPointsRedeemed = "channel.channel_points_custom_reward_redemption.add",
    ChannelPointsRedeemedUpdate = "channel.channel_points_custom_reward_redemption.update",
    HypeTrainBegin = "channel.hype_train.begin",
    HypeTrainProgress = "channel.hype_train.progress",
    HypeTrainEnd = "channel.hype_train.end",
    UserAuthorizationRevoke = "user.authorization.revoke",
    UserUpdate = "user.update",
}

enum SubscriptionStatus {
    Enabled = "enabled",
    VerificationPending = "webhook_callback_verification_pending",
    VerificationFailed = "webhook_callback_verification_failed",
    NotificationFailuresExceeded = "notification_failures_exceeded",
    AuthorizationRevoked = "authorization_revoked",
    UserRemoved = "user_removed",
}

enum ChannelPointRedemptionStatus {
    Unfulfilled = "UNFULFILLED",
    Fulfilled = "FULFILLED",
    Cancelled = "CANCELLED",
}

@injectable()
export default class TwitchEventService {
    private accessToken: IAccessToken;
    private verificationSecret: string = Config.twitch.eventSub.secret;
    private baseCallbackUrl: string = Config.twitch.eventSub.callbackBaseUri;
    private channelRewards: any[];

    constructor() {
        this.accessToken = {
            token: "",
            expiry: 0,
        };
        this.channelRewards = [];
    }

    public async handleNotification(notification: IEventSubNotification): Promise<void> {
        if (notification.subscription.type) {
            switch (notification.subscription.type) {
                case EventTypes.ChannelPointsRedeemed: {
                    this.channelPointsRedeemedEvent(notification.subscription);
                    break;
                }
                case EventTypes.ChannelPointsRedeemedUpdate: {
                    this.channelPointsRedeemedUpdateEvent(notification.subscription);
                    break;
                }
                case EventTypes.StreamOnline: {
                    this.channelOnlineEvent(notification.subscription);
                    break;
                }
                case EventTypes.StreamOffline: {
                    this.channelOfflineEvent(notification.subscription);
                    break;
                }
                case EventTypes.ChannelFollow: {
                    Logger.info(LogType.TwitchEvents, `Received event`, notification);
                    break;
                }
                default: {
                    Logger.warn(
                        LogType.Twitch,
                        `Twitch EventSub Notification received for event type ${notification.subscription.type}, but that event type is not handled.`,
                        notification
                    );
                    break;
                }
            }
        }
    }

    /**
     * Notification for when a user redeems a channel point reward. This does not mean that it has succeeded.
     * @param notificationEvent
     */
    private channelPointsRedeemedEvent(notificationEvent: ISubscriptionData): void {
        Logger.info(LogType.Twitch, "Channel Points Redeemed Add", notificationEvent);
    }

    /**
     * Notification for when a user redemption for a channel point reward updates it's status to FULFILLED or CANCELLED.
     * @param notificationEvent
     */
    private channelPointsRedeemedUpdateEvent(notificationEvent: ISubscriptionData): void {
        Logger.info(LogType.TwitchEvents, "Channel Points Redeemed Update", notificationEvent);
    }

    private channelOnlineEvent(notificationEvent: ISubscriptionData): void {
        Logger.info(LogType.Twitch, "Channel Online", notificationEvent);
    }

    private channelOfflineEvent(notificationEvent: ISubscriptionData): void {
        Logger.info(LogType.Twitch, "Channel Offline", notificationEvent);
    }

    public async subscribeEvent(event: EventTypes, userId: string): Promise<void> {
        const data = this.getSubscriptionData(event, userId);
        const result = await this.createSubscription(data);
        Logger.info(LogType.Twitch, `Created subscription for event type: ${event} for user id: ${userId}`, result);
    }

    public async subscribeStreamOnline(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventTypes.StreamOnline, userId);
        const result = await this.createSubscription(data);
    }

    public async subscribeStreamOffline(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventTypes.StreamOffline, userId);
        const result = await this.createSubscription(data);
    }

    public async subscribePointsRedeemed(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventTypes.ChannelPointsRedeemed, userId);
        const result = await this.createSubscription(data);
    }

    private getSubscriptionData(type: EventTypes, userId: any): ISubscriptionData {
        return {
            type,
            version: "1",
            condition: {
                broadcaster_user_id: userId,
            },
            transport: {
                method: "webhook",
                callback: `${this.baseCallbackUrl}/api/twitch/eventsub/callback`,
                secret: this.verificationSecret,
            },
        };
    }

    public async getSubscriptions(status?: SubscriptionStatus): Promise<any[]> {
        const options = await this.getOptions();

        let url: string = Constants.TwitchEventSubEndpoint;
        if (status) {
            url += `?status=${status}`;
        }

        const result = (await axios.get(url, options)).data;
        Logger.info(LogType.Twitch, result.data);
        return result.data;
    }

    public async setBaseCallbackUrl(url: string): Promise<void> {
        this.baseCallbackUrl = url;
        Logger.info(LogType.Twitch, `Set Base EventSub Callback URL to ${url}`);
    }

    public async deleteAllSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        subscriptions.forEach(async (value) => {
            await this.deleteSubscription(value.id);
        });
    }

    public async deleteInactiveSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        subscriptions.forEach(async (value) => {
            if (value.status !== "enabled") {
                await this.deleteSubscription(value.id);
            }
        });
    }

    private async deleteSubscription(id: string): Promise<void> {
        const options = await this.getOptions();
        const result = await axios.delete(`${Constants.TwitchEventSubEndpoint}?id=${id}`, options);
    }

    private async createSubscription(data: ISubscriptionData): Promise<ISubscriptionResponse | undefined> {
        const options = await this.getOptions("application/json");

        data.transport.secret = this.verificationSecret;
        const result = await axios.post(Constants.TwitchEventSubEndpoint, data, options);
        if (result.status === StatusCodes.ACCEPTED) {
            return result.data;
        } else {
            return undefined;
        }
    }

    private async refreshToken(): Promise<void> {
        if (this.accessToken.expiry < moment.now()) {
            await this.getAccessToken();
        }
    }

    private async getAccessToken(): Promise<void> {
        const result = await axios.post(
            `${Constants.TwitchTokenUrl}?client_id=${Config.twitch.clientId}&client_secret=${Config.twitch.clientSecret}&grant_type=client_credentials`
        );

        this.accessToken = {
            token: result.data.access_token,
            expiry: moment.now() + result.data.expires_in,
        };
    }

    private async getOptions(contentType?: string): Promise<AxiosRequestConfig> {
        await this.refreshToken();
        const options: AxiosRequestConfig = {
            headers: {
                "Client-Id": Config.twitch.clientId,
                Authorization: `Bearer ${this.accessToken.token}`,
            },
        };

        if (contentType) {
            options.headers["Content-Type"] = contentType;
        }

        return options;
    }
}
