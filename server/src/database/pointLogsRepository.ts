import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import * as moment from "moment";
import IPointLog, { PointLogType } from "../models/pointLog";

@injectable()
export class PointLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getStats(username: string, type: PointLogType | undefined): Promise<{won: number, lost: number}> {
        const databaseService = await this.databaseProvider();
        const filter = type ? {eventType: type, username} : {username};
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where(filter).andWhere("eventType", "<>", PointLogType.Reset)
            .andWhere("points", ">", 0).sum("points AS sum")
            .first()).sum ?? 0;

        const lost = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where(filter).andWhere("eventType", "<>", PointLogType.Reset)
            .andWhere("points", "<", 0).sum("points AS sum")
            .first()).sum ?? 0;

        return { won, lost };
    }

    public async add(log: IPointLog): Promise<void> {
        const databaseService = await this.databaseProvider();
        log.time = moment().utc().toDate();
        await databaseService.getQueryBuilder(DatabaseTables.PointLogs).insert(log);
    }

    public async reset(username: string) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.PointLogs).where({ username }).delete();
    }
}

export default PointLogsRepository;
