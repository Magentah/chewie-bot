export type UserLevel = {
     rank: number;
     name: string;
}

export enum UserLevels {
     None = 0,
     Viewer = 1,
     Subscriber,
     Moderator,
     Bot,
     Admin,
     Broadcaster,
 }
 