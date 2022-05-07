import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";

export interface IDBStreamActivity {
    id?: number;
    event: string;
    dateTimeTriggered: number;
}

@injectable()
export default class StreamActivityRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    /**
     * Get Stream Activity for a specific Event.
     * @param eventType The event type to get
     * @returns An array of events that were triggered matching the eventType passed.
     */
    public async getForEvent(eventType: string): Promise<IDBStreamActivity[]> {
        const databaseService = await this.databaseProvider();
        const triggeredEvents = await databaseService.getQueryBuilder(DatabaseTables.StreamActivity)
            .select("*")
            .where("event", "like", eventType)
            .orderBy("dateTimeTriggered", "asc");
        return triggeredEvents as IDBStreamActivity[];
    }

    /**
     * Gets the latest stream activity for a specific event.
     * @param eventType The event type to get
     * @returns Returns the most recent stream event that matches the eventType, or undefined if none exist.
     */
    public async getLatestForEvent(eventType: string): Promise<IDBStreamActivity | undefined> {
        const databaseService = await this.databaseProvider();
        const latestEvent = await databaseService
            .getQueryBuilder(DatabaseTables.StreamActivity)
            .first("*")
            .where("event", "like", eventType)
            .orderBy("dateTimeTriggered", "desc");

        if (latestEvent) {
            return latestEvent as IDBStreamActivity;
        } else {
            return;
        }
    }

    /**
     * Gets the latest (count) stream activities for a specific event, Sorted by the dateTime that the events were triggered.
     * @param eventType The event type to get.
     * @param count The number of events to get.
     * @param sortOrder The order to sort the result. "asc" or "desc".
     * @returns An array of events that were triggered matching the eventType passed, in the sort order provided.
     */
    public async getLastEvents(eventType: string, count: number, sortOrder: "asc" | "desc"): Promise<IDBStreamActivity[]> {
        const databaseService = await this.databaseProvider();
        const lastEvents = await databaseService
            .getQueryBuilder(DatabaseTables.StreamActivity)
            .select("*")
            .where("event", "like", eventType)
            .orderBy("dateTimeTriggered", sortOrder)
            .limit(count);

        return lastEvents as IDBStreamActivity[];
    }

    /**
     * Gets all events in a certain date range in ascending order.
     * @param start Inclusive start date
     * @param end Inclusive end date
     */
    public async getEventsInRange(start: Date, end: Date): Promise<IDBStreamActivity[]> {
        const databaseService = await this.databaseProvider();
        const lastEvents = await databaseService
            .getQueryBuilder(DatabaseTables.StreamActivity)
            .select("*")
            .where("dateTimeTriggered", ">=", start)
            .andWhere("dateTimeTriggered", "<=", end)
            .orderBy("dateTimeTriggered", "asc");

        return lastEvents as IDBStreamActivity[];
    }

    /**
     * Add a stream activity event.
     * @param eventType The event that was triggered.
     * @param dateTimeTriggered The dateTime that the event was triggered.
     */
    public async add(eventType: string, dateTimeTriggered: Date): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.StreamActivity).insert({ event: eventType, dateTimeTriggered });
    }
}
