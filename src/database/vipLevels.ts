import { inject, injectable } from 'inversify';
import DatabaseService, { Tables, DatabaseProvider } from '../services/databaseService';
import { IVIPLevel } from './../models/vipLevel';

@injectable()
export class VIPLevelsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService,
                @inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(name: string): Promise<IVIPLevel> {
        const databaseService = await this.databaseProvider();
        const vipLevel = await databaseService.getQueryBuilder(Tables.VIPLevels).first().where({ name });
        return vipLevel as IVIPLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.VIPLevels).insert({ name });
    }
}

export default VIPLevelsRepository;
