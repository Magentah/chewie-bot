import { inject, injectable } from 'inversify';
<<<<<<< HEAD
import { Tables, DatabaseProvider } from '../services/databaseService';
=======
import DatabaseService, { Tables, DatabaseProvider } from '../services/databaseService';
>>>>>>> 4a5ebff5151ef3b9986e95a79943047b45dc9fc5
import { IVIPLevel } from './../models/vipLevel';

@injectable()
export class VIPLevelsRepository {
<<<<<<< HEAD
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
=======
    constructor(@inject(DatabaseService) private databaseService: DatabaseService,
                @inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
>>>>>>> 4a5ebff5151ef3b9986e95a79943047b45dc9fc5
        // Empty
    }

    public async get(name: string): Promise<IVIPLevel> {
        const databaseService = await this.databaseProvider();
        const vipLevel = await databaseService.getQueryBuilder(Tables.VIPLevels).first().where({ name });
        return vipLevel as IVIPLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(Tables.VIPLevels).insert({ name });
    }
}

export default VIPLevelsRepository;
