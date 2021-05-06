export default interface IPointLog {
    id?: number;
    eventType: PointLogType;
    username: string;
    pointsBefore: number;
    points: number;
    time?: Date;
}

export enum PointLogType {
    PointRewardRedemption = "pointrewardredemption",
    Duel = "duel",
    Bankheist = "bankheist",
    Donation = "donation",
    Sub = "sub",
    GiftSubGiver = "giftsub",
    Resub = "resub",
    Bits = "bits",
    Auction = "auction",
    Arena = "arena",
    Redeem = "redeem",
    Give = "give",
    Add = "add",
    Rename = "rename",
    Reset = "reset",
    RedeemCard = "redeemcard"
}
