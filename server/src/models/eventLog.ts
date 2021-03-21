export default interface IEventLog {
    id?: number;
    type: EventLogType;
    username: string;
    data: object | Array<object>;
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
}
