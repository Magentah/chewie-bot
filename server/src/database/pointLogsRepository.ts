import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import * as moment from "moment";
import IPointLog, { PointLogType } from "../models/pointLog";

@injectable()
export class PointLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getSum(username: string, type: PointLogType): Promise<number> {
        const databaseService = await this.databaseProvider();
        return await databaseService.getQueryBuilder(DatabaseTables.PointLogs).where({eventType: type, username}).sum("points");
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
