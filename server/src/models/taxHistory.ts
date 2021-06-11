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
