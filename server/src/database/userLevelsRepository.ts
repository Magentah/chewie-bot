import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { Logger, LogType } from "../logger";
import { IUserLevel, UserLevels } from "./../models";

@injectable()
export class UserLevelsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<IUserLevel[]> {
        const databaseService = await this.databaseProvider();
        Logger.info(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.UserLevels).toSQL().sql
        );
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.UserLevels);
        return userLevel as IUserLevel[];
    }

    public async get(level: UserLevels): Promise<IUserLevel> {
        const databaseService = await this.databaseProvider();
        Logger.info(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ rank: level }).toSQL().sql
        );
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ rank: level });
        return userLevel as IUserLevel;
    }

    public async getById(id: number): Promise<IUserLevel> {
        const databaseService = await this.databaseProvider();
        Logger.info(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ id }).toSQL().sql
        );
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ id });
        return userLevel as IUserLevel;
    }

    public async add(level: UserLevels): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.UserLevels).insert({ id: level });
    }
}

export default UserLevelsRepository;
