export default interface IEventLog {
    id?: number;
    type: EventLogType;
    username: string;
    data: string;
    time?: Date;
}

export enum EventLogType {
    SongRequest = "songrequest",
    SongPlayed = "songplayed",
    SongRemoved = "songremoved",
    PointRewardRedemption = "pointrewardredemption",
    Duel = "duel",
    Bankheist = "bankheist",
    Command = "command",
    GoldAdded = "gold",
    GiftSub = "giftsub",
    CommunityGiftSub = "communitygiftsub",
    Donation = "donation",
    Sub = "sub",
    Resub = "resub",
    Bits = "bits",
    Streamlabs = "streamlabs",
    RenameUser = "renameuser",
    CardTrading = "cardtrading"
}
