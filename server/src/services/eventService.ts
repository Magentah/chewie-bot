import { inject, injectable } from "inversify";
import { IEvent, IUser } from "../models";

@injectable()

/**
 * Manages all currently ongoing events.
 */
export class EventService {
    /**
     * Contains all currently active events, including those that are currently in cooldown.
     */
    private runningEvents: IEvent[] = [];

    constructor() {        
    }

    /**
     * Starts a new event and sets a timer for the participation period.
     * @param event Event to start.
     * @param user The user who requested the event to start.
     * @returns Error message to post in chat if event cannot currently be started. Otherwise returns the started event.
     */
    public startEvent<T extends IEvent>(event: T, user : IUser): T | string {
        // Check for any running events that prevent the new event from starting.
        // In same cases an event of a certain type may only be active once, in other cases
        // (duel) it depends on the parameters.
        for (let runningEvent of this.runningEvents) {
            // Events only need to check for other events of the same type.
            if (event.constructor === runningEvent.constructor) {
                const [checkResult, message] = event.checkForOngoingEvent(runningEvent, user);
                if (!checkResult) {
                    return message;
                }
            }
        }

        this.runningEvents.push(event);
        event.start();
        this.startParticipation(event)
        return event;
    }

    private async startParticipation(event: IEvent) {
        await this.delay(event.initialParticipationPeriod);
        event.participationPeriodEnded();
    }

    /**
     * Removes and event from the event list, does not impose a cooldown on the event.
     * @param event Event to end
     */
    public stopEvent(event: IEvent) {
        const idx = this.runningEvents.indexOf(event);
        if (idx >= 0) {
            this.runningEvents.splice(idx, 1);
        }
    }

    /**
     * Removes an event from the event list after the event's cooldown has passed.
     * @param event Event to end
     */
    public async stopEventStartCooldown(event: IEvent) {
        await this.delay(event.cooldownPeriod);
        this.stopEvent(event);
        event.onCooldownComplete();
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    /**
     * Returns a list of all active events of a given type.
     */
    public getEvents<T extends IEvent>(): T[] {
        let events: T[] = [];

        for (let runningEvent of this.runningEvents) {
            const e = runningEvent as T;
            if (e) {
                events.push(e);
            }
        }

        return events;
    }
}

export default EventService;
