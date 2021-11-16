export enum TaxType {
    ChannelPoints = 0,
    Bits = 1
}

export interface IDBUserTaxHistory {
    id?: number;
    userId: number;
    taxRedemptionDate: Date;
    channelPointRewardTwitchId: string;
}

export interface IDBUserTaxStreak {
    id?: number;
    userId: number;
    currentStreak: number;
    longestStreak: number;
    lastTaxRedemptionId: number;
}
