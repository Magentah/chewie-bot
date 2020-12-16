export default interface IUserLevel {
    id?: number;
    name: string;
    rank: number;
}

export enum UserLevels {
    Viewer = 1,
    Subscriber,
    Moderator,
    Bot,
    Broadcaster,
}
