import { inject, injectable } from 'inversify';
import DatabaseService, { Tables } from '../services/databaseService';

export interface IUserLevel {
    id?: number;
    name: string;
}

@injectable()
export class UserLevels {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IUserLevel> {
        const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name });
        return userLevel as IUserLevel;
    }

    public async add(name: string): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.UserLevels).insert({ name });
    }
}

export default UserLevels;
