import { inject, injectable } from "inversify";
import { Database } from "sqlite3";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";

interface IDBStreamActivity {
    id?: number;
    event: string;
    dateTimeTriggered: Date;
}

@injectable()
export default class StreamActivityRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getForEvent(eventType: string): Promise<IDBStreamActivity[]> {
        const databaseService = await this.databaseProvider();
        const triggeredEvents = await databaseService.getQueryBuilder(DatabaseTables.StreamActivity).select("*").where("event", "like", eventType);
        return triggeredEvents as IDBStreamActivity[];
    }

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

    public async getLastEvents(eventType: string, count: number): Promise<IDBStreamActivity[]> {
        const databaseService = await this.databaseProvider();
        const lastEvents = await databaseService
            .getQueryBuilder(DatabaseTables.StreamActivity)
            .select("*")
            .where("event", "like", eventType)
            .orderBy("dateTimeTriggered", "desc")
            .limit(count);

        return lastEvents as IDBStreamActivity[];
    }

    public async add(eventType: string, dateTimeTriggered: Date): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.StreamActivity).insert({ event: eventType, dateTimeTriggered });
    }
}
