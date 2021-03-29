import { inject } from "inversify";
import TwitchService from "../services/twitchService";
import UserService from "../services/userService";
import { EventParticipant } from "./eventParticipant";
import { PointLogType } from "./pointLog";
import IUser from "./user";

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
    Ended = 3,
}

export default abstract class ParticipationEvent<T extends EventParticipant> {
    protected readonly pointLogType: PointLogType;

    /**
     * Specifies if the event is currently open (gathering participants).
     */
    public state: EventState = EventState.Open;

    /**
     * List of users participating in the event.
     */
    public participants: T[] = [];
    public participantUsernames: string[] = [];

    /**
     * Amount of time in ms for how long participants are being allowed to enter the event.
     */
    public readonly initialParticipationPeriod: number;

    /***
     * Amount of time that has to pass between events.
     */
    public readonly cooldownPeriod: number;

    constructor(
        @inject(TwitchService) protected twitchService: TwitchService,
        @inject(UserService) protected userService: UserService,
        initialParticipationPeriod: number,
        cooldownPeriod: number,
        pointLogType: PointLogType
    ) {
        this.initialParticipationPeriod = initialParticipationPeriod;
        this.cooldownPeriod = cooldownPeriod;
        this.pointLogType = pointLogType;
    }

    public validatePoints(user: IUser, channel: string, wager: number): boolean {
        if (!wager || wager <= 0) {
            this.twitchService.sendMessage(channel, "Your wager needs to be more than that, " + user.username);
            return false;
        }

        // Check if initiating user has enough points.
        if (user.points < wager) {
            this.twitchService.sendMessage(channel, user.username + ", you do not have enough chews to wager that much!");
            return false;
        }

        return true;
    }

    /**
     * Starts the event (gathering participants).
     */
    public abstract start(): void;

    /**
     * Called when the time for gathering participants has passed.
     */
    public abstract participationPeriodEnded(): void;

    /**
     * Allows any newly created event to check for other running events.
     * @param event Currently running event (can only be an event of the same type)
     * @param user User initiating the new event
     * @returns [true, ""] if no conflicts exist, [false, msg] when the event cannot be started because of conflicts.
     */
    public abstract checkForOngoingEvent(event: ParticipationEvent<T>, user: IUser): [boolean, string];

    /**
     * Adds a new participant to the event.
     * @param participant Participant to add
     * @returns true if the user has been added, false if the user is already enlisted.
     */
    public async addParticipant(participant: T, deductPoints: boolean): Promise<boolean> {
        for (const p of this.participants) {
            if (p.user.username.toLowerCase() === participant.user.username.toLowerCase()) {
                return false;
            }
        }

        this.participantUsernames.push(participant.user.username);
        this.participants.push(participant);

        if (deductPoints) {
            // Deduct all points used for the bet so that the points cannot be spent otherwise meanwhile.
            await this.userService.changeUserPoints(participant.user, -participant.points, this.pointLogType);
        }

        return true;
    }

    /**
     * Determines if a user has entered the event.
     */
    public hasParticipant(user: IUser): boolean {
        return this.getParticipant(user) !== undefined;
    }

    /**
     * Callback for sending messages to the chat.
     */
    public sendMessage: (msg: string) => void = () => undefined;

    /**
     * Called when the cooldown has completed.
     */
    public abstract onCooldownComplete(): void;

    public getParticipant(user: IUser): EventParticipant | undefined {
        for (const participant of this.participants) {
            if (participant.user.username.toLowerCase() === user.username.toLowerCase()) {
                return participant;
            }
        }

        return undefined;
    }

    protected delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
