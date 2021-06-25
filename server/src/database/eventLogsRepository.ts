import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { IEventLog, EventLogType } from "../models";
import * as moment from "moment";
import BotSettingsService, { BotSettings } from "../services/botSettingsService";

@injectable()
export class EventLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider,
                @inject(BotSettingsService) private settingsSerivce: BotSettingsService) {
        // Empty
    }

    public async getLast(type: EventLogType, count: number | undefined): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const query = databaseService.getQueryBuilder(DatabaseTables.EventLogs).select().where("type", "=", type).orderBy("time", "desc");
        const eventLogs: IEventLog[] = await (count ? query.limit(count) : query);
        return eventLogs;
    }

    public async getForUser(username: string, type: EventLogType[]): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select()
            .whereIn("type", type)
            .andWhere("username", "like", username)
            .orderBy("time", "desc");
        return eventLogs;
    }

    public async getAll(): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs).select();
        return eventLogs;
    }

    public async getCount(type: EventLogType, username: string): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select().where({ username, type }).count("id as cnt").first()).cnt;
        return count;
    }

    public async add(log: IEventLog): Promise<void> {
        const databaseService = await this.databaseProvider();
        log.time = moment().utc().toDate();
        await databaseService.getQueryBuilder(DatabaseTables.EventLogs).insert(log);

        switch (log.type) {
            case EventLogType.SongRequest:
            case EventLogType.Sudoku:
            case EventLogType.RedeemCommand:
                // Do not prune, needed for achievements.
                return;
        }

        // Prune data older than a configured amount
        const pruneDays = parseInt(await this.settingsSerivce.getValue(BotSettings.PruneLogsAfterDays), 10);
        const pruneDate = new Date(log.time);
        pruneDate.setDate(-pruneDays);
        await databaseService.getQueryBuilder(DatabaseTables.EventLogs).where("time", "<", pruneDate).delete();
    }
}

export default EventLogsRepository;
