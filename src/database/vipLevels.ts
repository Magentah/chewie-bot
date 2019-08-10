import { inject, injectable } from 'inversify';
import DatabaseService, { Tables } from '../services/databaseService';

export interface IVIPLevel {
    id?: number;
    name: string;
    rank: number;
}

@injectable()
export class VIPLevels {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IVIPLevel> {
        const vipLevel = await this.databaseService.getQueryBuilder(Tables.VIPLevels).first().where({ name });
        return vipLevel as IVIPLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.VIPLevels).insert({ name });
    }
}

export default VIPLevels;
