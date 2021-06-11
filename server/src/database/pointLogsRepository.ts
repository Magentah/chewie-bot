import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import * as moment from "moment";
import IPointLog, { PointLogType } from "../models/pointLog";
import { IUser } from "../models";

@injectable()
export class PointLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getStats(user: IUser, type: PointLogType | undefined): Promise<{won: number, lost: number}> {
        const databaseService = await this.databaseProvider();
        const filter = type ? {eventType: type, userId: user.id} : {userId: user.id};
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

    public async getWinCount(user: IUser, type: PointLogType): Promise<number> {
        const databaseService = await this.databaseProvider();
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where({ eventType: type, userId: user.id })
            .andWhere("points", ">", 0).count("id AS cnt")
            .first()).cnt ?? 0;
        return won;
    }

    public async add(log: IPointLog): Promise<void> {
        const databaseService = await this.databaseProvider();
        log.time = moment().utc().toDate();
        await databaseService.getQueryBuilder(DatabaseTables.PointLogs).insert(log);
    }

    public async reset(user: IUser) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.PointLogs).where({ userId: user.id }).delete();
    }
}

export default PointLogsRepository;
