export enum ChannelPointRedemption {
    Tax = "Tax Reward Event",
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
}

export interface IChannelPointRewardHistory {
    id?: number;
    userId: string;
    rewardId: string;
    associatedRedemption: string;
    timeTriggered: Date;
}
