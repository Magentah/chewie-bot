import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { IEventLog, EventLogType, IUser } from "../models";
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

    public async searchRequests(searchTerm: string, count: number = 0) {
        const databaseService = await this.databaseProvider();
        const query = databaseService.getQueryBuilder(DatabaseTables.EventLogs).select()
            .where("type", "=", EventLogType.SongPlayed)
            .fulltextSearch(searchTerm, ["data"])
            .orderBy("time", "desc");
        const eventLogs: IEventLog[] = await (count ? query.limit(count) : query);
        return eventLogs;
    }

    public async searchRequestsCount(searchTerm: string) {
        const databaseService = await this.databaseProvider();
        const result = await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .where("type", "=", EventLogType.SongPlayed)
            .fulltextSearch(searchTerm, ["data"])
            .count({cnt: "id"})
            .first();
        return result?.cnt ?? 0;
    }

    public async getForUser(user: IUser, type: EventLogType[]): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select()
            .whereIn("type", type)
            .andWhere("userId", user.id)
            .orderBy("time", "desc");
        return eventLogs;
    }

    public async getAll(): Promise<IEventLog[]> {
        const databaseService = await this.databaseProvider();
        const eventLogs: IEventLog[] = await databaseService.getQueryBuilder(DatabaseTables.EventLogs).select();
        return eventLogs;
    }

    public async getCount(type: EventLogType, user: IUser, sinceDate: Date = new Date(0)): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select().where({ userId: user.id, type }).andWhere("time", ">=", sinceDate).count("id as cnt").first()).cnt;
        return count;
    }

    public async getUsers(type: EventLogType, sinceDate: Date = new Date(0)): Promise<string[]> {
        const databaseService = await this.databaseProvider();
        const users = (await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select().where({ type }).andWhere("time", ">=", sinceDate).distinct().pluck("username")) as string[];
        return users;
    }

    public async getCountTotal(type: EventLogType, sinceDate: Date = new Date(0)): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .select().where({ type }).andWhere("time", ">=", sinceDate).count("id as cnt").first()).cnt;
        return count;
    }

    public async add(log: IEventLog): Promise<void> {
        const databaseService = await this.databaseProvider();
        log.time = moment().utc().toDate();
        await databaseService.getQueryBuilder(DatabaseTables.EventLogs).insert(log);

        // Prune data older than a configured amount
        const pruneDays = parseInt(await this.settingsSerivce.getValue(BotSettings.PruneLogsAfterDays), 10);
        const pruneDate = new Date(log.time);
        pruneDate.setDate(-pruneDays);
        await databaseService.getQueryBuilder(DatabaseTables.EventLogs)
            .where("time", "<", pruneDate)
            .whereNotIn("type", [EventLogType.SongRequest, EventLogType.Sudoku, EventLogType.RedeemCommand, EventLogType.SongPlayed, EventLogType.TaxEvasion])
            .delete();
    }
}

export default EventLogsRepository;
