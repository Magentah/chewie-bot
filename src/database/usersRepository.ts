import { inject, injectable } from 'inversify';
import { DatabaseService, Tables } from '../services/databaseService';
import { Logger, LogType } from '../logger';
import { IUser } from '../models/user';

@injectable()
export class UsersRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    /**
     * Gets a user from the database if the user exists.
     * @param username Username of the user to get
     */
    public async get(username: string): Promise<IUser> {
        Logger.info(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).first().where({ username }).toSQL().sql);

        // TODO: Fix this so that it's not 3 queries to get a single user... Raw sql is easy but I'm not sure about how to make the join work correctly
        // using knex yet.
        const user = await this.databaseService.getQueryBuilder(Tables.Users).first().where('username', 'like', username);
        if (user) {
            const userLevel = await this.databaseService.getQueryBuilder(Tables.UserLevels).first().where({ id: user.userLevelKey });
            const vipLevel = await this.databaseService.getQueryBuilder(Tables.VIPLevels).first().where({ id: user.vipLevelKey });
            user.userLevel = userLevel;
            user.vipLevel = vipLevel;
        }

        return user as IUser;
    }

    /**
     * Updates user data in the database if the user already exists.
     * @param user Updated user
     */
    public async update(user: IUser): Promise<void> {
        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id }).toSQL().sql);
        if (!await this.userExists(user)) {
            return;
        }

        delete user.userLevel;
        delete user.vipLevel;
        await this.databaseService.getQueryBuilder(Tables.Users).update(user).where({ id: user.id });
    }

    /**
     * Add a new user to the database if the user doesn't already exist.
     * @param user The user to add to the database
     */
    public async add(user: IUser): Promise<void> {
        if (await this.userExists(user)) {
            return;
        }

        Logger.debug(LogType.Database, this.databaseService.getQueryBuilder(Tables.Users).insert(user).toSQL().sql);
        await this.databaseService.getQueryBuilder(Tables.Users).insert(user);
    }

    /**
     * Private function to check if a user exists in the database
     * @param user User to get
     * @returns True if the user exists in the database, false if the user does not exist.
     */
    private async userExists(user: IUser): Promise<boolean> {
        if (user.id && user.id > 0) {
            const result = await this.databaseService.getQueryBuilder(Tables.Users).first().where({ id: user.id });
            if (result) {
                return true;
            }
        } else {
            const result = await this.databaseService.getQueryBuilder(Tables.Users).first().where('username', 'like', user.username);
            if (result) {
                return true;
            }
        }
        return false;
    }
}

export default UsersRepository;
