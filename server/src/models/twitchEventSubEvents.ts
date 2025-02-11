export interface ISubscriptionData {
    id?: string;
    status?: string;
    type: string;
    version: string;
    condition: ISubscriptionCondition;
    transport: ISubscriptionTransport;
    createdAt?: Date;
}

export interface ISubscriptionResponse extends ISubscriptionData {
    status: string;
    id: string;
    created_at: string;
}

export interface ISubscriptionCondition {
    broadcaster_user_id: string;
}

export interface ISubscriptionTransport {
    method: string;
    callback: string;
    secret: string;
}

export interface IAccessToken {
    token: string;
    expiry: number;
}

export interface IEventSubNotification {
    subscription: ISubscriptionData;
    event: any;
}

export interface IRewardRedemeptionEvent {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    user_id: string;
    user_login: string;
    user_input: string;
    status: ChannelPointRedemptionStatus;
    reward: IChannelReward;
    redeemed_at: string;
}

export interface IStreamOnlineEvent {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    type: string;
    started_at: string;
}

export interface IStreamOfflineEvent {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
}

export interface ISubscriptionEvent {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    tier: "1000" | "2000" | "3000";
    is_gift: boolean;
}

export interface ISubscriptionMessageEvent {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    tier: "1000" | "2000" | "3000";
    message: {
        text: string;
        emotes: {
            begin: number;
            end: number;
            id: string;
        }[];
    };
    cumulative_months: number;
    streak_months: number | null;
    duration_months: number;
}

export interface ISubscriptionGiftEvent {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    total: number;
    tier: string;
    cumulative_total: number;
    is_anonymous: boolean;
}

export interface IChannelReward {
    id: string;
    title: string;
    cost: number;
    prompt: string;
}

export enum EventTypes {
    StreamOnline = "stream.online",
    StreamOffline = "stream.offline",
    ChannelUpdate = "channel.update",
    ChannelFollow = "channel.follow",
    ChannelSubscribe = "channel.subscribe",
    ChannelSubscribeGift = "channel.subscription.gift",
    ChannelResubscribeMessage = "channel.subscription.message", // Resubscription message
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

export enum SubscriptionStatus {
    Enabled = "enabled",
    VerificationPending = "webhook_callback_verification_pending",
    VerificationFailed = "webhook_callback_verification_failed",
    NotificationFailuresExceeded = "notification_failures_exceeded",
    AuthorizationRevoked = "authorization_revoked",
    UserRemoved = "user_removed",
}

export enum ChannelPointRedemptionStatus {
    Unfulfilled = "unfulfilled",
    Fulfilled = "fulfilled",
    Cancelled = "canceled",
}
