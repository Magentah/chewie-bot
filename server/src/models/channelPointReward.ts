export enum ChannelPointRedemption {
    None = "None",
    Tax = "Tax Reward Event",
    Points = "Redeem points",
}

export default interface IChannelPointReward {
    id?: number;
    twitchRewardId: string;
    title: string;
    cost: number;
    isEnabled: boolean;
    isGlobalCooldownEnabled: boolean;
    globalCooldown?: number;
    shouldSkipRequestQueue: boolean;
    associatedRedemption?: string;
    isDeleted: boolean;
}

export interface IChannelPointRewardHistory {
    id?: number;
    userId: number;
    rewardId: string;
    associatedRedemption: string;
    dateTimeTriggered: Date;
}
