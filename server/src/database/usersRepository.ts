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
        return this.mapDBUserToUser(userResult);
    }

    /**
     * Updates user data in the database if the user already exists.
     * @param user Updated user
     * @param points Number of points to add or remove (if negative)
     */
    public async incrementPoints(user: IUser, points: number): Promise<void> {
        const databaseService = await this.databaseProvider();

        await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .increment("points", points)
            .whereExists((q) => {
                return q.select().from(DatabaseTables.Users).where({ id: user.id });
            });
    }

    /**
     * Increments or decrements the number of points for a user.
     * @param user Updated user
     */
    public async update(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();

        // Update should not manipulate original object.
        const userData = { ...user };
        delete userData.userLevel;
        delete userData.vipLevel;
        delete userData.twitchUserProfile;

        await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .update(userData)
            .whereExists((q) => {
                if (user.id) {
                    return q.select().from(DatabaseTables.Users).where({ id: user.id });
                } else {
                    return q.select().from(DatabaseTables.Users).where({ username: user.username });
                }
            });
    }

    /**
     * Add a new user to the database if the user doesn't already exist.
     * @param user The user to add to the database
     */
    public async add(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.Users).insert(user).onConflict("username").ignore();
    }

    public async addMultiple(users: IUser[]): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.Users).insert(users).onConflict("username").ignore();
    }

    private mapDBUserToUser(userResult: any): IUser {
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
}

export default UsersRepository;
