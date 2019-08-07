import { inject, injectable } from 'inversify';
import { DatabaseService, Tables } from '../services/databaseService';
import { Logger, LogType } from '../logger';

export interface IUser {
    id?: number;
    username: string;
    idToken: string;
    refreshToken: string;
    points: number;
    vipExpiry: Date | undefined;
    modLevel?: string;
    userLevel?: string;
}

@injectable()
export class Users {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }
    public async get(username: string): Promise<IUser> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).first().where({ username }).toSQL().sql);
        const user = await this.databaseService.getQueryBuilder(Tables.Users).first().where({ username });
        return user as IUser;
    }

    public async update(user: IUser): Promise<void> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id }).toSQL().sql);
        await this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id });
    }

    public async add(user: IUser): Promise<void> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).insert(user).toSQL().sql);
        await this.databaseService.getQueryBuilder(Tables.Users).insert(user);
    }
}

export default Users;
