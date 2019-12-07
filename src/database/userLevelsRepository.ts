import { inject, injectable } from 'inversify';
import DatabaseService, { Tables, DatabaseProvider } from '../services/databaseService';
import Logger, { LogType } from '../logger';
import { IUserLevel } from './../models/userLevel';

@injectable()
export class UserLevelsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService, 
                @inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Emptyhhrr
    }

    public async get(name: string): Promise<IUserLevel> {
        console.log("-======", this.databaseProvider);
        let databaseService = await this.databaseProvider().then(databaseService => { 
            console.log("db-provider---------", databaseService)
            return databaseService;
        });
        console.log("dbservice-userlevels", databaseService.getQueryBuilder);
        Logger.info(LogType.Database, this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name }).toSQL().sql);
        const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ name });
        return userLevel as IUserLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.UserLevels).insert({ name });
    }
}

export default UserLevelsRepository;
