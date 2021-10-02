export default interface IPointLog {
    id?: number;
    eventType: PointLogType;
    userId: number;
    username: string;
    pointsBefore: number;
    points: number;
    time?: Date;
    reason: PointLogReason;
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
    RedeemCard = "redeemcard",
    CardTrading = "cardtrading",
    CardRecycle = "cardrecycle",
    Achievement = "achievement",
}

export enum PointLogReason {
    None = "",
    Refund = "refund",
    Win = "win",
    Draw = "draw",
    FirstPlace = "win-1st",
    SecondPlace = "win-2nd",
    ThirdPlace = "win-3rd",
}
