import IUser from './user';

export interface IEventParticipant {
    user: IUser;
    points: number;
}

export interface IEvent {
    name: string;
    isOpen: boolean;
    participants: IEventParticipant[];

    checkConflict(event: IEvent) : [boolean, string];
    hasParticipant(user: IUser) : boolean;
}

export default IEvent;
