import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { Logger, LogType } from "../logger";
import { IUserLevel, UserLevels } from "./../models";

@injectable()
export class UserLevelsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(level: UserLevels): Promise<IUserLevel> {
        const databaseService = await this.databaseProvider();
        Logger.info(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name: level }).toSQL().sql
        );
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name: level });
        return userLevel as IUserLevel;
    }

    public async add(level: UserLevels): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.UserLevels).insert({ name: level });
    }
}

export default UserLevelsRepository;
