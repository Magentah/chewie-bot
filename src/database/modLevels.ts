import { inject, injectable } from 'inversify';
import DatabaseService, { Tables } from '../services/databaseService';

export interface IModLevel {
    id?: number;
    name: string;
}

@injectable()
export class ModLevels {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IModLevel> {
        const userLevel = await this.databaseService.getQueryBuilder(Tables.ModLevels).first().where({ name });
        return userLevel as IModLevel;
    }

    public async add(name: string): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.UserLevels).insert({ name });
    }
}

export default ModLevels;
