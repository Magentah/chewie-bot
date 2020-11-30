export default interface IUserLevel {
    id?: number;
    name: string;
    rank: number;
}

export enum UserLevelName { 
    Viewer,
    Subscriber,
    Moderator,
    Bot,
    Broadcaster,
}
