import axios, { AxiosRequestConfig } from "axios";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import * as Config from "../config.json";
import Constants from "../constants";
import * as moment from "moment";
import { StatusCodes } from "http-status-codes";
import { UserService } from "./userService";
import DiscordService from "./discordService";
import * as EventSub from "../models";

@injectable()
export default class TwitchEventService {
    private accessToken: EventSub.IAccessToken;
    private verificationSecret: string = Config.twitch.eventSub.secret;
    private baseCallbackUrl: string = Config.twitch.eventSub.callbackBaseUri;
    private channelRewards: any[];

    constructor(
        @inject(UserService) private users: UserService,
        @inject(DiscordService) private discord: DiscordService
    ) {
        this.accessToken = {
            token: "",
            expiry: 0,
        };
        this.channelRewards = [];
    }

    public async handleNotification(notification: EventSub.IEventSubNotification): Promise<void> {
        if (notification.subscription.type) {
            switch (notification.subscription.type) {
                case EventSub.EventTypes.ChannelPointsRedeemed: {
                    this.channelPointsRedeemedEvent(notification.event);
                    break;
                }
                case EventSub.EventTypes.ChannelPointsRedeemedUpdate: {
                    this.channelPointsRedeemedUpdateEvent(notification.event);
                    break;
                }
                case EventSub.EventTypes.StreamOnline: {
                    this.channelOnlineEvent(notification.event);
                    break;
                }
                case EventSub.EventTypes.StreamOffline: {
                    this.channelOfflineEvent(notification.event);
                    break;
                }
                case EventSub.EventTypes.ChannelFollow: {
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
    private channelPointsRedeemedEvent(notificationEvent: any): void {
        Logger.info(LogType.Twitch, "Channel Points Redeemed Add", notificationEvent);
    }

    /**
     * Notification for when a user redemption for a channel point reward updates it's status to FULFILLED or CANCELLED.
     * @param notificationEvent
     */
    private async channelPointsRedeemedUpdateEvent(
        notificationEvent: EventSub.IRewardRedemeptionUpdateEvent
    ): Promise<void> {
        Logger.info(LogType.TwitchEvents, "Channel Points Redeemed Update", notificationEvent);
        // We only update points if the redemption was fulfilled. If it's cancelled, we don't.
        if (
            notificationEvent.status === EventSub.ChannelPointRedemptionStatus.Fulfilled &&
            this.rewardAddsUserPoints(notificationEvent)
        ) {
            let user = await this.users.getUser(notificationEvent.user_login);
            if (!user) {
                // User hasn't logged in to the bot, or it's their first time interacting with the bot. Need to add as a new user.
                user = await this.users.addUser(notificationEvent.user_login);
            }
            this.users.changeUserPoints(user, notificationEvent.reward.cost * Config.twitch.pointRewardMultiplier);
        }
    }

    /**
     * Checks if a Channel Point Reward should add user points
     * @param notificationEvent The EventSub event
     * @returns True if the reward should add points to the user, false if not.
     */
    private rewardAddsUserPoints(notificationEvent: EventSub.IRewardRedemeptionUpdateEvent): boolean {
        // TODO: For now just check if the reward title includes "chews". This should probably be changed later
        // so that you can configure each custom point reward but this will work for now.
        if (notificationEvent.reward.title.toLowerCase().indexOf("chews") > -1) {
            return true;
        }
        return false;
    }

    private channelOnlineEvent(notificationEvent: EventSub.IStreamOnlineEvent): void {
        Logger.info(LogType.Twitch, "Channel Online", notificationEvent);
        this.discord.sendStreamOnline();
    }

    private channelOfflineEvent(notificationEvent: EventSub.IStreamOfflineEvent): void {
        Logger.info(LogType.Twitch, "Channel Offline", notificationEvent);
        this.discord.sendStreamOffline();
    }

    public async subscribeEvent(event: EventSub.EventTypes, userId: string): Promise<void> {
        const data = this.getSubscriptionData(event, userId);
        const result = await this.createSubscription(data);
        Logger.info(LogType.Twitch, `Created subscription for event type: ${event} for user id: ${userId}`, result);
    }

    public async subscribeStreamOnline(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOnline, userId);
        const result = await this.createSubscription(data);
    }

    public async subscribeStreamOffline(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOffline, userId);
        const result = await this.createSubscription(data);
    }

    public async subscribePointsRedeemed(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.ChannelPointsRedeemed, userId);
        const result = await this.createSubscription(data);
    }

    private getSubscriptionData(type: EventSub.EventTypes, userId: any): EventSub.ISubscriptionData {
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

    public async getSubscriptions(status?: EventSub.SubscriptionStatus): Promise<any[]> {
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

    private async createSubscription(
        data: EventSub.ISubscriptionData
    ): Promise<EventSub.ISubscriptionResponse | undefined> {
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
