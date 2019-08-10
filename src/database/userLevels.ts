import { inject, injectable } from 'inversify';
import DatabaseService, { Tables } from '../services/databaseService';
import Logger, { LogType } from '../logger';

export interface IUserLevel {
    id?: number;
    name: string;
    rank: number;
}

@injectable()
export class UserLevels {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IUserLevel> {
        Logger.info(LogType.Database, this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name }).toSQL().sql);
        const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name });
        return userLevel as IUserLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.UserLevels).insert({ name });
    }
}

export default UserLevels;
