import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

@injectable()
export class UsersRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    /**
     * Gets a user from the database if the user exists.
     * @param username Username of the user to get
     */
    public async get(username: string): Promise<IUser | undefined> {
        const databaseService = await this.databaseProvider();
        Logger.debug(
            LogType.Database,
            databaseService
                .getQueryBuilder(DatabaseTables.Users)
                .join(DatabaseTables.UserLevels, "userLevels.id", "users.userLevelKey")
                .join(DatabaseTables.VIPLevels, "vipLevels.id", "users.vipLevelKey")
                .where("users.username", "like", username)
                .first(["vipLevels.name as vipLevel", "userLevels.name as userLevel", "users.*"])
                .toSQL().sql
        );

        const userResult = await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .join(DatabaseTables.UserLevels, "userLevels.id", "users.userLevelKey")
            .join(DatabaseTables.VIPLevels, "vipLevels.id", "users.vipLevelKey")
            .leftJoin(DatabaseTables.TwitchUserProfile, "twitchUserProfile.id", "users.twitchProfileKey")
            .where("users.username", "like", username)
            .first([
                "vipLevels.name as vipLevel",
                "userLevels.name as userLevel",
                "twitchUserProfile.id as profileId",
                "twitchUserProfile.displayName as profileDisplayName",
                "twitchUserProfile.profileImageUrl as profileImageUrl",
                "users.*",
            ]);

        if (!userResult) {
            return undefined;
        }

        // Need to map from SQLResult to the correct model.
        const user: IUser = {
            hasLogin: userResult.hasLogin,
            points: userResult.points,
            username: userResult.username,
            id: userResult.id,
            idToken: userResult.idToken,
            accessToken: userResult.accessToken,
            refreshToken: userResult.refreshToken,
            spotifyRefresh: userResult.spotifyRefresh,
            streamlabsRefresh: userResult.streamlabsRefresh,
            streamlabsToken: userResult.streamlabsToken,
            streamlabsSocketToken: userResult.streamlabsSocketToken,
            twitchProfileKey: userResult.twitchProfileKey,
            userLevel: userResult.userLevel,
            vipLevel: userResult.vipLevel,
            vipExpiry: userResult.vipExpiry,
            userLevelKey: userResult.userLevelKey,
            vipLevelKey: userResult.vipLevelKey,
            twitchUserProfile: {
                username: userResult.username,
                displayName: userResult.profileDisplayName,
                id: userResult.profileId,
                profileImageUrl: userResult.profileImageUrl,
            },
        };

        return user;
    }

    /**
     * Updates user data in the database if the user already exists.
     * @param user Updated user
     * @param points Number of points to add or remove (if negative)
     */
    public async incrementPoints(user: IUser, points: number): Promise<void> {
        if (!(await this.userExists(user))) {
            return;
        }

        const databaseService = await this.databaseProvider();

        Logger.debug(
            LogType.Database,
            databaseService
                .getQueryBuilder(DatabaseTables.Users)
                .increment("points", points)
                .where({ id: user.id })
                .toSQL().sql
        );

        await databaseService.getQueryBuilder(DatabaseTables.Users).increment("points", points).where({ id: user.id });
    }

    /**
     * Increments or decrements the number of points for a user.
     * @param user Updated user
     */
    public async update(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();
        Logger.debug(
            LogType.Database,
            databaseService.getQueryBuilder(DatabaseTables.Users).update(user).where({ id: user.id }).toSQL().sql
        );
        if (!(await this.userExists(user))) {
            return;
        }

        // Update should not manipulate original object.
        const userData = { ...user };
        delete userData.userLevel;
        delete userData.vipLevel;
        delete userData.twitchUserProfile;

        await databaseService.getQueryBuilder(DatabaseTables.Users).update(userData).where({ id: user.id });
    }

    /**
     * Add a new user to the database if the user doesn't already exist.
     * @param user The user to add to the database
     */
    public async add(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();
        if (await this.userExists(user)) {
            return;
        }

        Logger.debug(LogType.Database, databaseService.getQueryBuilder(DatabaseTables.Users).insert(user).toSQL().sql);
        await databaseService.getQueryBuilder(DatabaseTables.Users).insert(user);
    }

    /**
     * Private function to check if a user exists in the database
     * @param user User to get
     * @returns True if the user exists in the database, false if the user does not exist.
     */
    private async userExists(user: IUser): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (user.id && user.id > 0) {
            const result = await databaseService.getQueryBuilder(DatabaseTables.Users).first().where({ id: user.id });
            if (result) {
                return true;
            }
        } else {
            const result = await databaseService
                .getQueryBuilder(DatabaseTables.Users)
                .first()
                .where("username", "like", user.username);
            if (result) {
                return true;
            }
        }
        return false;
    }
}

export default UsersRepository;
