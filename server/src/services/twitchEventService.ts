import axios, { AxiosRequestConfig } from "axios";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import * as Config from "../config.json";
import Constants from "../constants";
import * as moment from "moment";
import { StatusCodes } from "http-status-codes";
import { UserService } from "./userService";
import DiscordService from "./discordService";
import EventLogService from "./eventLogService";
import * as EventSub from "../models";
import { TwitchAuthService } from ".";
import { PointLogType } from "../models/pointLog";
import { TwitchWebService } from "./twitchWebService";

@injectable()
export default class TwitchEventService {
    private accessToken: EventSub.IAccessToken;
    private verificationSecret: string = Config.twitch.eventSub.secret;
    private baseCallbackUrl: string = Config.twitch.eventSub.callbackBaseUri;
    private channelRewards: any[];
    private activeEventTypes: EventSub.EventTypes[] = [
        EventSub.EventTypes.ChannelPointsRedeemed,
        EventSub.EventTypes.ChannelPointsRedeemedUpdate,
        EventSub.EventTypes.StreamOnline,
        EventSub.EventTypes.StreamOffline,
    ];
    private broadcasterUserId: number = 0;
    private eventCallbacks: { [key: string]: Function[] } = {};

    constructor(
        @inject(UserService) private users: UserService,
        @inject(DiscordService) private discord: DiscordService,
        @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(TwitchWebService) private twitchWebService: TwitchWebService,
        @inject(EventLogService) private eventLogService: EventLogService
    ) {
        this.accessToken = {
            token: "",
            expiry: 0,
        };
        this.channelRewards = [];
    }

    /**
     * Goes through startup process for TwitchEventSub service. Will subscribe to default events if they're not already subscribed to
     * and delete inactive subscriptions.
     *
     * Only works if the broadcaster has a valid twitch profile.
     * @returns
     */
    public async startup(): Promise<void> {
        if (this.broadcasterUserId == 0) {
            const broadcaster = await this.users.getBroadcaster();
            if (broadcaster?.twitchUserProfile) {
                this.broadcasterUserId = broadcaster.twitchUserProfile.id;
            } else {
                Logger.warn(LogType.TwitchEvents, "Broadcaster Twitch Profile does not exist. Cannot create subscriptions to EventSub.");
                return;
            }
        }
        // Delete all inactive subscriptions.
        await this.deleteInactiveSubscriptions();

        // Gets all existing subscriptions and subscription types.
        const existingSubscriptions = await this.getSubscriptions();
        const existingSubscriptionTypes = existingSubscriptions.map((subscription) => {
            return subscription.type;
        });

        // If there's any subscriptions that don't exist that we want, create them again.
        this.activeEventTypes.forEach(async (type) => {
            if (!existingSubscriptionTypes.find((existingType) => type == existingType)) {
                const data = this.getSubscriptionData(type, this.broadcasterUserId.toString());
                const result = await this.createSubscription(data);
            }
        });
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
            // Call all callbacks for the notification type.
            this.eventCallbacks[notification.subscription.type].forEach((callback) => callback(notification));
        }
    }

    /**
     * Subscribe to a Twitch Event.
     * @param eventType The EventType of the Twitch Event
     * @param callback The function to call when the event is triggered.
     */
    public subscribeToEvent(eventType: EventSub.EventTypes, callback: Function): void {
        if (this.eventCallbacks[eventType]) {
            this.eventCallbacks[eventType].push(callback);
        } else {
            this.eventCallbacks[eventType] = [callback];
        }
    }

    /**
     * Notification for when a user redeems a channel point reward. This does not mean that it has succeeded.
     * @param notificationEvent
     */
    private async channelPointsRedeemedEvent(notificationEvent: EventSub.IRewardRedemeptionEvent): Promise<void> {
        // We only update points if the redemption was fulfilled. If it's cancelled, we don't.
        Logger.info(LogType.Twitch, "Channel Points Redeemed Add", notificationEvent);
        if (this.rewardAddsUserPoints(notificationEvent)) {
            let user = await this.users.getUser(notificationEvent.user_login);
            if (!user) {
                // User hasn't logged in to the bot, or it's their first time interacting with the bot. Need to add as a new user.
                user = await this.users.addUser(notificationEvent.user_login);
            }
            this.eventLogService.addChannelPointRedemption(user.username, {
                message: `${user.username} has redeemed ${notificationEvent.reward.title} with cost ${notificationEvent.reward.cost}`,
                event: notificationEvent,
                pointsAdded: notificationEvent.reward.cost * Config.twitch.pointRewardMultiplier,
            });
            await this.users.changeUserPoints(user, notificationEvent.reward.cost * Config.twitch.pointRewardMultiplier, PointLogType.PointRewardRedemption);
            // Set reward status to fulfilled.
            await this.twitchWebService.updateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "FULFILLED");
        }
    }

    /**
     * Notification for when a user redemption for a channel point reward updates its status to FULFILLED or CANCELLED.
     * @param notificationEvent
     */
    private async channelPointsRedeemedUpdateEvent(notificationEvent: EventSub.IRewardRedemeptionEvent): Promise<void> {
        Logger.info(LogType.TwitchEvents, "Channel Points Redeemed Update", notificationEvent);
    }

    /**
     * Checks if a Channel Point Reward should add user points
     * @param notificationEvent The EventSub event
     * @returns True if the reward should add points to the user, false if not.
     */
    private rewardAddsUserPoints(notificationEvent: EventSub.IRewardRedemeptionEvent): boolean {
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

    public async createEventSubscription(event: EventSub.EventTypes, userId: string): Promise<void> {
        const data = this.getSubscriptionData(event, userId);
        const result = await this.createSubscription(data);
        Logger.info(LogType.Twitch, `Created subscription for event type: ${event} for user id: ${userId}`, result);
    }

    public async createStreamOnlineSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOnline, userId);
        const result = await this.createSubscription(data);
    }

    public async createStreamOfflineSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOffline, userId);
        const result = await this.createSubscription(data);
    }

    public async createPointsRedeemedSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.ChannelPointsRedeemed, userId);
        const result = await this.createSubscription(data);
    }

    public async createPointsRedeemedUpdateSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.ChannelPointsRedeemedUpdate, userId);
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

    public async getSubscriptions(status?: EventSub.SubscriptionStatus): Promise<EventSub.ISubscriptionData[]> {
        const options = await this.getOptions();

        let url: string = Constants.TwitchEventSubEndpoint;
        if (status) {
            url += `?status=${status}`;
        }

        const result = (await axios.get(url, options)).data;
        Logger.info(LogType.Twitch, result.data);
        return result.data as EventSub.ISubscriptionData[];
    }

    public async setBaseCallbackUrl(url: string): Promise<void> {
        this.baseCallbackUrl = url;
        Logger.info(LogType.Twitch, `Set Base EventSub Callback URL to ${url}`);
    }

    public async deleteAllSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        subscriptions.forEach(async (value) => {
            if (value.id) {
                await this.deleteSubscription(value.id);
            }
        });
    }

    public async deleteInactiveSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        subscriptions.forEach(async (value) => {
            if (value.status !== "enabled" && value.id) {
                await this.deleteSubscription(value.id);
            }
        });
    }

    private async deleteSubscription(id: string): Promise<void> {
        const options = await this.getOptions();
        const result = await axios.delete(`${Constants.TwitchEventSubEndpoint}?id=${id}`, options);
    }

    private async createSubscription(data: EventSub.ISubscriptionData): Promise<EventSub.ISubscriptionResponse | undefined> {
        const options = await this.getOptions("application/json");

        data.transport.secret = this.verificationSecret;
        try {
            const result = await axios.post(Constants.TwitchEventSubEndpoint, data, options);
            if (result.status === StatusCodes.ACCEPTED) {
                return result.data;
            } else {
                return undefined;
            }
        } catch (ex) {
            Logger.err(LogType.TwitchEvents, "Error when creating a subscription.", ex);
        }
    }

    private async refreshToken(): Promise<void> {
        if (this.accessToken.expiry < moment.now()) {
            await this.getAccessToken();
        }
    }

    private async getAccessToken(): Promise<void> {
        this.accessToken = (await this.authService.getClientAccessToken()).accessToken;
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
