import IUser from './user';

export interface IEventParticipant {
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

export interface IEvent {
    /**
     * Specifies if the event is currently open (gathering participants).
     */
    state: EventState;

    /**
     * List of users participating in the event.
     */
    participants: IEventParticipant[];
    
    /**
     * Amount of time in ms for how long participants are being allowed to enter the event.
     */
    readonly initialParticipationPeriod : number;

    /***
     * Amount of time that has to pass between events.
     */
    readonly cooldownPeriod : number;

    /**
     * Starts the event (gathering participants).
     */
    start() : void;

    /**
     * Called when the time for gathering participants has passed.
     */
    participationPeriodEnded() : void;

    /**
     * Allows any newly created event to check for other running events.
     * @param event Currently running event (can only be an event of the same type)
     * @param user User initiating the new event
     * @returns [true, ""] if no conflicts exist, [false, msg] when the event cannot be started because of conflicts.
     */
    checkForOngoingEvent(event: IEvent, user : IUser) : [boolean, string];

    /**
     * Determines if a user has entered the event.
     */
    hasParticipant(user: IUser) : boolean;

    /**
     * Callback for sending messages to the chat.
     */
    sendMessage: (msg: string) => void;

    /**
     * Called when the cooldown has completed.
     */
    onCooldownComplete() : void;
}

export default IEvent;
