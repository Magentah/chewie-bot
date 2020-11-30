import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { Logger, LogType } from "../logger";
import { IUserLevel, UserLevelName } from "./../models";

@injectable()
export class UserLevelsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(name: UserLevelName): Promise<IUserLevel> {
        const databaseService = await this.databaseProvider();
        Logger.info(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name }).toSQL().sql
        );
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name });
        return userLevel as IUserLevel;
    }

    public async add(name: UserLevelName, rank: number): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.UserLevels).insert({ name });
    }
}

export default UserLevelsRepository;
