import { inject, injectable } from 'inversify';
import { DatabaseService, Tables } from '../services/databaseService';
import { Logger, LogType } from '../logger';
import { IUserLevel } from './userLevels';
import { IVIPLevel } from './vipLevels';

export interface IUser {
    id?: number;
    username: string;
    idToken: string;
    refreshToken: string;
    points: number;
    vipExpiry: Date | undefined;
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevelKey?: number;
    userLevel?: IUserLevel;
}

@injectable()
export class Users {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }
    public async get(username: string): Promise<IUser> {
        Logger.info(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).first().where({ username }).toSQL().sql);
        const user = await this.databaseService.getQueryBuilder(Tables.Users).first().where('username', 'like', username);
        if (user) {
            const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ id: user.userLevelKey });
            const vipLevel = await this.databaseService.getQueryBuilder(Tables.VIPLevels).first().where({ id: user.vipLevelKey });
            user.userLevel = userLevel;
            user.vipLevel = vipLevel;
        }

        return user as IUser;
    }

    public async update(user: IUser): Promise<void> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id }).toSQL().sql);
        delete user.userLevel;
        delete user.vipLevel;
        await this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id });
    }

    public async add(user: IUser): Promise<void> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).insert(user).toSQL().sql);
        await this.databaseService.getQueryBuilder(Tables.Users).insert(user);
    }
}

export default Users;
