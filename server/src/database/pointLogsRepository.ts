import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import * as moment from "moment";
import IPointLog, { PointLogReason, PointLogType } from "../models/pointLog";
import { IUser } from "../models";

@injectable()
export class PointLogsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getStats(user: IUser, type: PointLogType | undefined, sinceDate: Date = new Date(0)): Promise<{won: number, lost: number}> {
        const databaseService = await this.databaseProvider();
        const filter = type ? {eventType: type, userId: user.id} : {userId: user.id};
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where(filter).andWhere("eventType", "<>", PointLogType.Reset)
            .andWhere("points", ">", 0).sum("points AS sum")
            .andWhere("time", ">=", sinceDate)
            .first()).sum ?? 0;

        const lost = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where(filter).andWhere("eventType", "<>", PointLogType.Reset)
            .andWhere("points", "<", 0).sum("points AS sum")
            .andWhere("time", ">=", sinceDate)
            .first()).sum ?? 0;

        return { won, lost };
    }

    public async getGameStats(user: IUser): Promise<{won: number, lost: number}> {
        const databaseService = await this.databaseProvider();
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where({userId: user.id}).whereIn("eventType", [PointLogType.Bankheist, PointLogType.Arena, PointLogType.Duel])
            .andWhere("points", ">", 0).sum("points AS sum")
            .first()).sum ?? 0;

        const lost = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
        .where({userId: user.id}).whereIn("eventType", [PointLogType.Bankheist, PointLogType.Arena, PointLogType.Duel])
            .andWhere("points", "<", 0).sum("points AS sum")
            .first()).sum ?? 0;

        return { won, lost };
    }

    public async getWinCount(user: IUser, type: PointLogType, reason: PointLogReason, sinceDate: Date = new Date(0)): Promise<number> {
        const databaseService = await this.databaseProvider();
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where({ eventType: type, userId: user.id, reason })
            .andWhere("points", ">", 0).count("id AS cnt")
            .andWhere("time", ">=", sinceDate)
            .first()).cnt ?? 0;
        return won;
    }

    public async getCount(user: IUser, type: PointLogType, reason: PointLogReason, sinceDate: Date = new Date(0)): Promise<number> {
        const databaseService = await this.databaseProvider();
        const won = (await databaseService.getQueryBuilder(DatabaseTables.PointLogs)
            .where({ eventType: type, userId: user.id, reason })
            .andWhere("time", ">=", sinceDate)
            .count("id AS cnt")
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

    public async archivePoints(user: IUser, seasonId: number) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.PointArchive).insert({"userId": user.id, "seasonId": seasonId, "points": user.points});
    }
}

export default PointLogsRepository;
