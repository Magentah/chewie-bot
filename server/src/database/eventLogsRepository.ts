import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services";
import { IEventLog, EventLogType } from "../models";
import * as moment from "moment";

@injectable()
export class EventLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(type: EventLogType): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs).select().where("type", "=", type);
        return eventLogs;
    }

    public async getForUser(username: string): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs).select().where("username", "=", username);
        return eventLogs;
    }

    public async getAll(): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs).select();
        return eventLogs;
    }

    public async add(log: IEventLog): Promise<void> {
        const databaseService = await this.databaseProvider();
        log.time = moment().utc().toDate();
        databaseService.getQueryBuilder(DatabaseTables.EventLogs).insert(log);
    }
}

export default EventLogsRepository;
