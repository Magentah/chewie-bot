import { inject, injectable } from 'inversify';
import { Tables, DatabaseProvider } from '../services/databaseService';
import Logger, { LogType } from '../logger';
import { IUserLevel } from './../models/userLevel';

@injectable()
export class UserLevelsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(name: string): Promise<IUserLevel> {
<<<<<<< HEAD
        const databaseService = await this.databaseProvider();
        Logger.info(LogType.Database, databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name }).toSQL().sql);
        const userLevel = await databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name });
=======
        // let databaseService = await this.databaseProvider().then(databaseService => { 
        //     return databaseService;
        // });
        let databaseService = await this.databaseProvider();
        console.log("==============", databaseService);
        console.log("dbservice-userlevels", databaseService.getQueryBuilder);
        console.log("----------");
        Logger.info(LogType.Database, this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name }).toSQL().sql);
        console.log("----------");
        const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name });
>>>>>>> 4a5ebff5151ef3b9986e95a79943047b45dc9fc5
        return userLevel as IUserLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(Tables.UserLevels).insert({ name });
    }
}

export default UserLevelsRepository;
