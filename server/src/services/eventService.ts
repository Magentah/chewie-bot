import { inject, injectable } from "inversify";
import ParticipationEvent, { EventState } from "../models/event";
import { EventParticipant } from "../models/eventParticipant";
import Logger, { LogType } from "../logger";
import { IEvent, IUser } from "../models";

@injectable()

/**
 * Manages all currently ongoing events.
 */
export class EventService {
    /**
     * Contains all currently active events, including those that are currently in cooldown.
     */
    private runningEvents: Array<ParticipationEvent<EventParticipant>> = [];

    /**
     * Starts a new event and sets a timer for the participation period.
     * @param event Event to start.
     * @param user The user who requested the event to start.
     * @returns Error message to post in chat if event cannot currently be started. Otherwise returns the started event.
     */
    public startEvent<T extends ParticipationEvent<EventParticipant>>(event: T, user: IUser): T | string {
        // Check for any running events that prevent the new event from starting.
        // In same cases an event of a certain type may only be active once, in other cases
        // (duel) it depends on the parameters.
        for (const runningEvent of this.runningEvents) {
            // Events only need to check for other events of the same type.
            if (event.constructor === runningEvent.constructor) {
                const [checkResult, message] = event.checkForOngoingEvent(runningEvent, user);
                if (!checkResult) {
                    return message;
                }
            }
        }

        Logger.info(LogType.Command, `Adding event ${event.constructor.name} initiated by ${user.username} to the event list, starting participation period of ${event.initialParticipationPeriod} ms.`);
        this.runningEvents.push(event);
        event.start();
        this.startParticipation(event);
        return event;
    }

    private async startParticipation(event: ParticipationEvent<EventParticipant>) {
        await this.delay(event.initialParticipationPeriod);
        Logger.info(LogType.Command, `Participation period for event ${event.constructor.name} has ended`);
        event.participationPeriodEnded();
    }

    /**
     * Removes and event from the event list, does not impose a cooldown on the event.
     * @param event Event to end
     */
    public stopEvent(event: ParticipationEvent<EventParticipant>) {
        Logger.info(LogType.Command, `Removing event ${event.constructor.name} from the event list`);

        const idx = this.runningEvents.indexOf(event);
        if (idx >= 0) {
            this.runningEvents.splice(idx, 1);
        }
    }

    /**
     * Removes an event from the event list after the event's cooldown has passed.
     * @param event Event to end
     */
    public async stopEventStartCooldown(event: ParticipationEvent<EventParticipant>) {
        Logger.info(LogType.Command, `Ending event ${event.constructor.name} with cooldown of ${event.cooldownPeriod} ms`);

        event.state = EventState.Ended;
        await this.delay(event.cooldownPeriod);
        this.stopEvent(event);
        event.onCooldownComplete();
    }

    private delay(ms: number) {
        return new Promise( (resolve) => setTimeout(resolve, ms) );
    }

    /**
     * Returns a list of all active events of a given type.
     */
    public getEvents<T extends ParticipationEvent<EventParticipant>>(): T[] {
        const events: T[] = [];

        for (const runningEvent of this.runningEvents) {
            const e = runningEvent as T;
            if (e) {
                events.push(e);
            }
        }

        return events;
    }
}

export default EventService;
