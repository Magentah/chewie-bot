import { inject, injectable } from "inversify";
import { DatabaseService, DatabaseTables } from "../services/databaseService";
import { Logger, LogType } from "../logger";
import { IUserLevel } from "./../models";

@injectable()
export class UserLevelsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IUserLevel> {
        Logger.info(
            LogType.Database,
            this.databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name }).toSQL().sql
        );
        const userLevel = await this.databaseService.getQueryBuilder(DatabaseTables.UserLevels).first().where({ name });
        return userLevel as IUserLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(DatabaseTables.UserLevels).insert({ name });
    }
}

export default UserLevelsRepository;
