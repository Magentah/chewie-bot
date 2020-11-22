import IUser from './user';

export class EventParticipant {
    constructor(user: IUser, wager: number) {
        this.user = user;
        this.points = wager;
    }

    /**
     * The user participating in the event.
     */
    public user: IUser;

    /**
     * The number of points that are placed on the bet.
     */
    public points: number;
}
