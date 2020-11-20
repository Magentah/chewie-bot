import IUser from './user';

export class EventParticipant {
    constructor(user : IUser, wager : number) {
        this.user = user;
        this.points = wager;
    }

    /**
     * The user participating in the event.
     */
    user: IUser;
    
    /**
     * The number of points that are placed on the bet.
     */
    points: number;
}

export enum EventState {
    /**
     * Initial status, users can participate.
     */
    Open = 1,

    /**
     * No further users can participate.
     */
    BoardingCompleted = 2,

    /**
     * Finished, but in cooldown.
     */
    Ended = 3
}

export abstract class ParticipationEvent<T extends EventParticipant> {
    /**
     * Specifies if the event is currently open (gathering participants).
     */
    public state: EventState = EventState.Open;

    /**
     * List of users participating in the event.
     */
    public participants: T[] = [];
    
    /**
     * Amount of time in ms for how long participants are being allowed to enter the event.
     */
    public readonly initialParticipationPeriod : number;

    /***
     * Amount of time that has to pass between events.
     */
    public readonly cooldownPeriod : number;

    constructor(initialParticipationPeriod : number, cooldownPeriod: number) {
        this.initialParticipationPeriod = initialParticipationPeriod;
        this.cooldownPeriod = cooldownPeriod;
    }

    /**
     * Starts the event (gathering participants).
     */
    public abstract start() : void;

    /**
     * Called when the time for gathering participants has passed.
     */
    public abstract participationPeriodEnded() : void;

    /**
     * Allows any newly created event to check for other running events.
     * @param event Currently running event (can only be an event of the same type)
     * @param user User initiating the new event
     * @returns [true, ""] if no conflicts exist, [false, msg] when the event cannot be started because of conflicts.
     */
    public abstract checkForOngoingEvent(event: ParticipationEvent<T>, user : IUser) : [boolean, string];

    /**
     * Adds a new participant to the event.
     * @param participant 
     * @returns true if the user has been added, false if the user is already enlisted.
     */
    public addParticipant(participant: T) : boolean {
        for (let p of this.participants) {
            if (p.user.username.toLowerCase() === participant.user.username.toLowerCase()) {
                return false;
            }
        }

        this.participants.push(participant);
        return true;
    }

    /**
     * Determines if a user has entered the event.
     */
    public hasParticipant(user: IUser) : boolean {
        return this.getParticipant(user) != null;
    }

    /**
     * Callback for sending messages to the chat.
     */
    public sendMessage: (msg: string) => void = () => {};

    /**
     * Called when the cooldown has completed.
     */
    public abstract onCooldownComplete() : void;

    public getParticipant(user: IUser) : EventParticipant | null {
        for (let participant of this.participants) {
            if (participant.user.username.toLowerCase() === user.username.toLowerCase()) {
                return participant;
            }
        }

        return null;
    }
    
    protected delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}

export default ParticipationEvent;
