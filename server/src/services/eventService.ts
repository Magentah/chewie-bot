import { inject, injectable } from "inversify";
import { BotContainer } from "src/inversify.config";
import { InvalidSongUrlError } from "../errors";
import { Logger, LogType } from "../logger";
import { IEvent } from "../models";
import WebsocketService from "./websocketService";

@injectable()
export class EventService {
    private runningEvents: IEvent[] = [];

    constructor() {        
    }

    /**
     * Starts a new event.
     * @param event Event to start.
     * @returns Error message to post in chat if event cannot currently be started. Otherwise returns the started event.
     */
    public startEvent<T extends IEvent>(event: T): T | string {
        // Check for any running events that prevent the new event from starting.
        // In same cases an event of a certain type may only be active once, in other cases
        // (duel) it depends on the parameters.
        for (let runningEvent of this.runningEvents)
        {
            // Events only need to check for other events of the same type.
            if (event.constructor == runningEvent.constructor)
            {
                const [checkResult, message] = runningEvent.checkConflict(event);
                if (!checkResult)
                {
                    return message;
                }
            }
        }

        this.runningEvents.push(event);
        return event;
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
