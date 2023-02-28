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
import StreamActivityRepository from "../database/streamActivityRepository";
import ChannelPointRewardService from "./channelPointRewardService";
import * as EventSub from "../models";
import { EventTypes, ChannelPointRedemption, ITwitchChannelReward, RequestSource } from "../models";
import { TwitchAuthService, UserPermissionService } from ".";
import BotSettingsService, { BotSettings } from "./botSettingsService";
import { PointLogType } from "../models/pointLog";
import { TwitchWebService } from "./twitchWebService";
import { SongService } from "./songService";
import TwitchService from "./twitchService";

@injectable()
export default class TwitchEventService {
    private accessToken: EventSub.IAccessToken;
    private verificationSecret: string = Config.twitch.eventSub.secret;
    private baseCallbackUrl: string = Config.twitch.eventSub.callbackBaseUri;
    private activeEventTypes: EventSub.EventTypes[] = [
        EventSub.EventTypes.ChannelPointsRedeemed,
        EventSub.EventTypes.ChannelPointsRedeemedUpdate,
        EventSub.EventTypes.StreamOnline,
        EventSub.EventTypes.StreamOffline,
    ];
    private broadcasterUserId = 0;
    private eventCallbacks: { [key: string]: Function[] } = {};

    constructor(
        @inject(UserService) private users: UserService,
        @inject(DiscordService) private discord: DiscordService,
        @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(TwitchWebService) private twitchWebService: TwitchWebService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(ChannelPointRewardService) private channelPointRewardService: ChannelPointRewardService,
        @inject(StreamActivityRepository) private streamActivityRepository: StreamActivityRepository,
        @inject(SongService) private songService: SongService,
        @inject(TwitchService) private twitchService: TwitchService,
        @inject(BotSettingsService) private settingsService: BotSettingsService,
        @inject(UserPermissionService) private userPermissionService: UserPermissionService,
    ) {
        this.accessToken = {
            token: "",
            expiry: 0,
        };
    }

    /**
     * Goes through startup process for TwitchEventSub service. Will subscribe to default events if they're not already subscribed to
     * and delete inactive subscriptions.
     *
     * Only works if the broadcaster has a valid twitch profile.
     * @returns
     */
    public async startup(): Promise<void> {
        if (this.broadcasterUserId === 0) {
            const broadcaster = await this.users.getBroadcaster();
            if (broadcaster?.twitchUserProfile && broadcaster?.twitchUserProfile?.id) {
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
        for (const type of this.activeEventTypes) {
            if (!existingSubscriptionTypes.find((existingType) => type === existingType)) {
                const data = this.getSubscriptionData(type, this.broadcasterUserId.toString());
                await this.createSubscription(data);
            }
        };
    }

    public async handleNotification(notification: EventSub.IEventSubNotification): Promise<void> {
        if (!notification.subscription.type) {
            return;
        }

        switch (notification.subscription.type) {
            case EventSub.EventTypes.ChannelPointsRedeemed: {
                await this.channelPointsRedeemedEvent(notification.event);
                break;
            }
            case EventSub.EventTypes.ChannelPointsRedeemedUpdate: {
                this.channelPointsRedeemedUpdateEvent(notification.event);
                break;
            }
            case EventSub.EventTypes.StreamOnline: {
                await this.channelOnlineEvent(notification.event);
                break;
            }
            case EventSub.EventTypes.StreamOffline: {
                await this.channelOfflineEvent(notification.event);
                break;
            }
            case EventSub.EventTypes.ChannelFollow: {
                Logger.info(LogType.TwitchEvents, "Received event", notification);
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
        Logger.info(LogType.TwitchEvents, `Calling event callback for ${notification.subscription.type}`, notification);
        Logger.info(
            LogType.TwitchEvents,
            `There are currently ${Object.keys(this.eventCallbacks).length} callbacks for the following types: ${Object.keys(this.eventCallbacks).join(" - ")}`
        );

        if (this.eventCallbacks[notification.subscription.type]) {
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
        const user = await this.users.addUser(notificationEvent.user_login);
        await this.eventLogService.addChannelPointRedemption(user, {
            message: `${user.username} has redeemed ${notificationEvent.reward.title} with cost ${notificationEvent.reward.cost}`,
            event: notificationEvent,
            pointsAdded: notificationEvent.reward.cost * Config.twitch.pointRewardMultiplier,
        });

        // This should always have an id at this point, but TypeScript doesn't like if you don't actually check for it.
        if (user.id) {
            // If there is a reward redemption associated with a twitch channel reward, this will add it to the history with the associated redemption.
            const twitchReward = notificationEvent.reward as ITwitchChannelReward;
            const reward = await this.channelPointRewardService.getChannelReward(twitchReward);
            if (!reward) {
                return;
            }

            await this.channelPointRewardService.channelPointRewardRedemptionTriggered(reward, user.id);

            switch (reward.associatedRedemption) {
                case ChannelPointRedemption.Points:
                    // Check for read-only mode here if we ever implement redemptions that can be set to CANCELED by the bot.
                    let redemptionState: "FULFILLED" | "CANCELED" = "FULFILLED";
                    try {
                        if (reward.hasOwnership && await this.settingsService.getBoolValue(BotSettings.ReadonlyMode)) {
                            // It should not be possible to redeem in this state, just making sure to check
                            // here if the states ever gets out of sync.
                            redemptionState = "CANCELED";
                        } else {
                            await this.users.changeUserPoints(
                                user,
                                notificationEvent.reward.cost * Config.twitch.pointRewardMultiplier,
                                PointLogType.PointRewardRedemption
                            );
                        }
                    } catch (err) {
                        Logger.err(LogType.TwitchEvents, "Could not convert channel points.", err);
                        redemptionState = "CANCELED";
                    }

                    if (reward.hasOwnership) {
                        await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, redemptionState);
                    }
                    break;

                case ChannelPointRedemption.SongRequest:
                    try {
                        for (const match of SongService.getSongsForQueue(notificationEvent.user_input)) {
                            const comments = notificationEvent.user_input.replace(match, "");
                            const song = await this.songService.addSong(match, RequestSource.ChannelPoints, user.username, comments);
                            if (reward.hasOwnership) {
                                // Attach redemption event for future processing (fulfill or cancel).
                                song.rewardEvent = notificationEvent;
                            }

                            if (song) {
                                await this.twitchService.sendMessage(
                                    notificationEvent.broadcaster_user_login,
                                    `${song.title} was added to the song queue by ${song.requestedBy} at position ${this.songService.getSongQueue().indexOf(song) + 1}!`
                                );

                                // Pause redemptions after a certain amount of songs.
                                if (reward.hasOwnership) {
                                    const maxSongs = await this.settingsService.getIntValue(BotSettings.MaxSongRequestRedemptionsInQueue);
                                    if (maxSongs > 0) {
                                        let countInQueue = 0;
                                        for (const inQueue of this.songService.getSongQueue()) {
                                            if (inQueue.requestSource === RequestSource.ChannelPoints) {
                                                countInQueue++;
                                            }
                                        }

                                        if (countInQueue >= maxSongs) {
                                            await this.twitchWebService.updateChannelReward(notificationEvent.reward.id, { is_paused: true });
                                        }
                                    }
                                }
                            }

                            // Only one song allowed.
                            break;
                        }
                    } catch (err: any) {
                        if (reward.hasOwnership) {
                            await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "CANCELED");
                        }

                        await this.twitchService.sendMessage(
                            notificationEvent.broadcaster_user_login,
                            `${user.username}, the song could not be added to the queue (${err}).`
                        );
                    }
                    break;

                case ChannelPointRedemption.Timeout:
                    try {
                        if (await this.twitchWebService.isUserModded(notificationEvent.user_input) === true) {
                            // Regular timeout only for non-mods.
                            await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "CANCELED");
                        } else {
                            const duration = await this.settingsService.getIntValue(BotSettings.TimeoutDuration);
                            await this.twitchService.banUser(notificationEvent.user_input, duration, "Channel point redemption");
                            await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "FULFILLED");
                        }
                    } catch (err) {
                        Logger.err(LogType.TwitchEvents, "Could not timeout user.", err);
                        // No cancel, but also no fulfill. Let mods handle it.
                    }
                    break;

                case ChannelPointRedemption.TimeoutMod:
                    try {
                        if (await this.twitchWebService.isUserModded(notificationEvent.user_input) === true) {
                            const duration = await this.settingsService.getIntValue(BotSettings.TimeoutDuration);
                            await this.twitchService.banUser(notificationEvent.user_input, duration, "Channel point redemption");
                            await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "FULFILLED");
                        } else{
                            await this.twitchWebService.tryUpdateChannelRewardStatus(notificationEvent.reward.id, notificationEvent.id, "CANCELED");
                        }
                    } catch (err) {
                        Logger.err(LogType.TwitchEvents, "Could not timeout user (mod).", err);
                        // No cancel, but also no fulfill. Let mods handle it.
                    }
                    break;
            }
        }
    }

    /**
     * Notification for when a user redemption for a channel point reward updates its status to FULFILLED or CANCELED.
     * @param notificationEvent
     */
    private channelPointsRedeemedUpdateEvent(notificationEvent: EventSub.IRewardRedemeptionEvent): void {
        Logger.info(LogType.TwitchEvents, "Channel Points Redeemed Update", notificationEvent);
    }

    private async channelOnlineEvent(notificationEvent: EventSub.IStreamOnlineEvent): Promise<void> {
        Logger.info(LogType.Twitch, "Channel Online", notificationEvent);

        const dateTimeOnline = new Date(notificationEvent.started_at);
        await this.streamActivityRepository.add(EventTypes.StreamOnline, dateTimeOnline);

        await this.discord.sendStreamOnline();
    }

    private async channelOfflineEvent(notificationEvent: EventSub.IStreamOfflineEvent): Promise<void> {
        Logger.info(LogType.Twitch, "Channel Offline", notificationEvent);

        const dateTimeOffline = new Date();
        await this.streamActivityRepository.add(EventTypes.StreamOffline, dateTimeOffline);

        await this.discord.sendStreamOffline();
    }

    public async createEventSubscription(event: EventSub.EventTypes, userId: string): Promise<void> {
        const data = this.getSubscriptionData(event, userId);
        const result = await this.createSubscription(data);
        Logger.info(LogType.Twitch, `Created subscription for event type: ${event} for user id: ${userId}`, result);
    }

    public async createStreamOnlineSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOnline, userId);
        await this.createSubscription(data);
    }

    public async createStreamOfflineSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.StreamOffline, userId);
        await this.createSubscription(data);
    }

    public async createPointsRedeemedSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.ChannelPointsRedeemed, userId);
        await this.createSubscription(data);
    }

    public async createPointsRedeemedUpdateSubscription(userId: string): Promise<void> {
        const data = this.getSubscriptionData(EventSub.EventTypes.ChannelPointsRedeemedUpdate, userId);
        await this.createSubscription(data);
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
        return result.data as EventSub.ISubscriptionData[];
    }

    public setBaseCallbackUrl(url: string): void {
        this.baseCallbackUrl = url;
        Logger.info(LogType.Twitch, `Set Base EventSub Callback URL to ${url}`);
    }

    public async deleteAllSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        for (const value of subscriptions) {
            if (value.id) {
                await this.deleteSubscription(value.id);
            }
        };
    }

    public async deleteInactiveSubscriptions(): Promise<void> {
        const subscriptions = await this.getSubscriptions();
        for (const value of subscriptions) {
            if (value.status !== "enabled" && value.id) {
                await this.deleteSubscription(value.id);
            }
        }
    }

    private async deleteSubscription(id: string): Promise<void> {
        const options = await this.getOptions();
        await axios.delete(`${Constants.TwitchEventSubEndpoint}?id=${id}`, options);
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
        } catch (ex: any) {
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
