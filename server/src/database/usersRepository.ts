import { inject, injectable } from "inversify";
import { PointLogReason, PointLogType } from "../models/pointLog";
import { CryptoHelper } from "../helpers";
import { EventLogType, IUser, UserLevels } from "../models";
import DatabaseService, { DatabaseProvider, DatabaseTables } from "../services/databaseService";

@injectable()
export class UsersRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    private makeUserQuery(databaseService: DatabaseService) {
        return databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .join(DatabaseTables.VIPLevels, "vipLevels.id", "users.vipLevelKey")
            .leftJoin(DatabaseTables.TwitchUserProfile, "twitchUserProfile.id", "users.twitchProfileKey")
            .select([
                "vipLevels.name as vipLevel",
                "twitchUserProfile.id as profileId",
                "twitchUserProfile.displayName as profileDisplayName",
                "twitchUserProfile.profileImageUrl as profileImageUrl",
                "users.*",
            ]);
    }

    /**
     * Gets a user from the database if the user exists.
     * @param username Username of the user to get
     */
    public async get(username: string): Promise<IUser | undefined> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService).where("users.username", "like", username).first();

        if (!userResult) {
            return undefined;
        }

        // Need to map from SQLResult to the correct model.
        return this.mapDBUserToUser(userResult);
    }

    /**
     * Gets a user from the database if the user exists.
     * @param id ID of the user to get
     */
    public async getById(id: number): Promise<IUser | undefined> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService).where("users.id", id).first();

        if (!userResult) {
            return undefined;
        }

        // Need to map from SQLResult to the correct model.
        return this.mapDBUserToUser(userResult);
    }

    public async getByIds(ids: number[]): Promise<IUser[]> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService).whereIn("users.id", ids);

        if (!userResult) {
            return [];
        }

        return this.mapDBMultipleUsers(userResult);
    }

    /**
     * Gets all users from the database.
     */
    public async getList(): Promise<IUser[]> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService);

        // Need to map from SQLResult to the correct model.
        return userResult.map((x: any) => this.mapDBUserToUser(x));
    }

    /**
     * Gets all users from the database that still have an active VIP gold subscription for a given date.
     */
    public async getActiveVipGoldUsers(referenceDate: Date): Promise<IUser[]> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService).where("vipExpiry", ">", referenceDate);

        // Need to map from SQLResult to the correct model.
        return userResult.map((x: any) => this.mapDBUserToUser(x));
    }

    /**
     * Gets all users that made song requests in the past.
     */
    public async getUsersWithSongrequests(): Promise<{ username: string, id: number }[]> {
        const databaseService = await this.databaseProvider();

        const userResult = await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .innerJoin(DatabaseTables.EventLogs, "eventLogs.username", "users.username")
            .where("eventLogs.type", "=", EventLogType.SongRequest)
            .select([
                "users.username",
                "users.id"
            ]).distinct();

        return userResult;
    }

    /**
     * Gets all users that have points.
     */
    public async getUsersWithPoints(): Promise<IUser[]> {
        const databaseService = await this.databaseProvider();
        const userResult = await this.makeUserQuery(databaseService).where("points", ">", 0);

        // Need to map from SQLResult to the correct model.
        return userResult.map((x: any) => this.mapDBUserToUser(x));
    }

    /**
     * Gets a user leaderboard (only returns basic information)
     */
    public async getLeaderboard(topCount: number, includeUser: IUser | undefined, seasonId: number | undefined): Promise<{username: string, points: number, rank: number}[]> {
        const databaseService = await this.databaseProvider();

        let userResult;
        if (seasonId) {
            userResult = await databaseService
                .getQueryBuilder(DatabaseTables.PointArchive)
                .leftJoin(DatabaseTables.Users, "userId", "users.id")
                .where("seasonId", seasonId)
                .orderBy("pointArchive.points", "desc").orderBy("username", "asc")
                .limit(topCount)
                .select([
                    "users.username",
                    "pointArchive.points"
                ]);
        } else {
            userResult = await databaseService
                .getQueryBuilder(DatabaseTables.Users)
                .orderBy("points", "desc").orderBy("username", "asc")
                .limit(topCount)
                .select([
                    "users.username",
                    "users.points"
                ]);
        }

        let counter = 1;
        const result = userResult.map((x: any) => { return { username: x.username, points: x.points, rank: counter++ } });

        // Check if user is part of toplist and add if not
        if (includeUser) {
            const curentUser = result.filter((item: any) => item.username === includeUser.username)[0] || undefined;
            let userPoints = includeUser.points;
            if (!curentUser) {
                let currentUserRank;
                if (seasonId) {
                    userPoints = (await databaseService
                        .getQueryBuilder(DatabaseTables.PointArchive)
                        .where("seasonId", seasonId)
                        .andWhere("userId", includeUser.id)
                        .select("points")
                        .first())?.points ?? 0;
                    currentUserRank = (await databaseService
                        .getQueryBuilder(DatabaseTables.PointArchive)
                        .where("seasonId", seasonId)
                        .andWhere("points", ">", userPoints)
                        .count("id as cnt")
                        .first()).cnt;
                } else {
                    currentUserRank = (await databaseService
                        .getQueryBuilder(DatabaseTables.Users)
                        .where("points", ">", includeUser.points)
                        .count("id as cnt")
                        .first()).cnt;
                }

                result.push({ username: includeUser.username, points: userPoints, rank: currentUserRank + 1});
                return result;
            }
        }

        return result;
    }

    /**
     * Determines the user's ranking in terms of points.
     * @param user User object
     * @returns Rank
     */
    public async getPointsRank(user: IUser): Promise<number> {
        const databaseService = await this.databaseProvider();

        const userResult = await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .count("id AS cnt")
            .where("points", ">", user.points)
            .first();

        return userResult.cnt + 1;
     }

    /**
     * Returns a list of user names with top amount of points
     * @param userCount Limit of number of users to return
     * @returns [username, points]
     */
    public async getTopUsers(userCount: number): Promise<{ username: string, points: number }[]> {
        const databaseService = await this.databaseProvider();

        const userResult = await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .select(["username", "points"])
            .orderBy("points", "desc")
            .limit(userCount);

        return userResult;
    }

    /**
     * Updates user data in the database if the user already exists.
     * Increments or decrements the number of points for a user.
     * @param user Updated user
     * @param points Number of points to add or remove (if negative)
     */
    public async incrementPoints(user: IUser, points: number, eventType: PointLogType | string, reason: PointLogReason | undefined): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.Users).increment("points", points).where({ id: user.id });

        await databaseService
            .getQueryBuilder(DatabaseTables.PointLogs)
            .insert({ eventType, userId: user.id, username: user.username, pointsBefore: user.points - points, points, time: new Date(), reason });
    }

    /**
     * Updates a user's VIP expiry date.
     * @param user user with new expiration date
     */
    public async updateVipExpiry(user: IUser) {
        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(DatabaseTables.Users)
            .update({ vipExpiry: user.vipExpiry, vipPermanentRequests: user.vipPermanentRequests })
            .where({ id: user.id });
    }

    /**
     * Moves data from one user to the other.
     */
    public async moveUserData(fromUser: IUser, toUser: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();

        await databaseService.getQueryBuilder(DatabaseTables.PointLogs).where({ userId: fromUser.id }).update({ userId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardHistory).where({ userId: fromUser.id }).update({ userId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.EventLogs).where({ userId: fromUser.id }).update({ userId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.Songlist).where({ attributedUserId: fromUser.id }).update({ attributedUserId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.UserAchievements).where({ userId: fromUser.id }).update({ userId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ userId: fromUser.id }).update({ userId: toUser.id });
        await databaseService.getQueryBuilder(DatabaseTables.UserTaxHistory).where({ userId: fromUser.id }).update({ userId: toUser.id });
        
        // Merge would be better but in practice this is not likely to be needed.
        await databaseService.getQueryBuilder(DatabaseTables.UserTaxStreak).where({ userId: fromUser.id }).delete();

        // Perform merge (unique key constraint)
        await databaseService.getQueryBuilder(DatabaseTables.CardUpgrades).delete().where({ userId: toUser.id })
            .whereIn("upgradeCardId", (b) => b.select("upgradeCardId").from(DatabaseTables.CardUpgrades).where({ userId: fromUser.id }));
        await databaseService.getQueryBuilder(DatabaseTables.CardUpgrades).where({ userId: fromUser.id }).update({ userId: toUser.id });
    }

    /**
     * Updates user data in the database if the user already exists.
     * @param user Updated user
     */
    public async update(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();

        const userData = this.encryptUser(user);

        // encryptUser() will return a copy of the object so we can safely delete here
        delete userData.vipLevel;
        delete userData.twitchUserProfile;

        if (user.id) {
            await databaseService.getQueryBuilder(DatabaseTables.Users).update(userData).where({ id: user.id });
        } else {
            await databaseService.getQueryBuilder(DatabaseTables.Users).update(userData).where({ username: user.username });
        }
    }

    /**
     * Renames an existing user.
     * @param user Updated user
     */
    public async renameUser(user: IUser, newUserName: string) {
        if (user.id) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.Users).update({ username: newUserName }).where({ id: user.id });
            user.username = newUserName;
        }
    }

    /**
     * Updates only the public information of a user, excluding authenticationd data.
     * @param user Updated user
     */
    public async updateDetails(user: IUser): Promise<void> {
        const databaseService = await this.databaseProvider();

        const userData = this.mapUserToDetailsUserData(user);

        // mapUserToDetailsUserData() will return a copy of the object so we can safely delete here
        delete userData.vipLevel;
        delete userData.twitchUserProfile;

        if (user.id) {
            await databaseService.getQueryBuilder(DatabaseTables.Users).update(userData).where({ id: user.id });
        } else {
            await databaseService.getQueryBuilder(DatabaseTables.Users).update(userData).where({ username: user.username });
        }
    }

    /**
     * Removes all authentication data from the user for security reasons.
     * @param userData User object
     * @returns User object without access/refresh tokens
     */
    public mapUserToDetailsUserData(userData: any): IUser {
        const user: IUser = {
            id: userData.id,
            username: userData.username,
            vipExpiry: userData.vipExpiry,
            vipLastRequest: userData.vipLastRequest,
            vipLevel: userData.vipLevel,
            vipLevelKey: userData.vipLevelKey,
            userLevel: userData.userLevel,
            points: userData.points,
            hasLogin: userData.hasLogin,
            vipPermanentRequests: userData.vipPermanentRequests
        }

        return user;
    }

    /**
     * Add a new user to the database if the user doesn't already exist.
     * @param user The user to add to the database
     */
    public async add(user: IUser): Promise<IUser> {
        const databaseService = await this.databaseProvider();

        const userData = this.encryptUser(user);
        await databaseService.getQueryBuilder(DatabaseTables.Users).insert(userData).onConflict("username").ignore();
        const returnUser = await this.get(user.username);
        return returnUser as IUser;
    }

    /**
     * Creates an user object that represents an anonymous user.
     * @returns user object
     */
    public static getAnonUser(): IUser {
        return {
            username: "",
            points: 0,
            hasLogin: false,
            userLevel: UserLevels.Viewer,
            twitchUserProfile: {
                id: 0,
                displayName: "Anonymous",
                username: "",
                profileImageUrl: "",
            },
        };
    }

    public async addMultiple(users: IUser[]): Promise<IUser[]> {
        const databaseService = await this.databaseProvider();
        const usersData = users.map((user) => {
            return this.encryptUser(user);
        });
        const ids = await databaseService.getQueryBuilder(DatabaseTables.Users).insert(usersData).onConflict("username").ignore();
        return await this.getByIds(ids);
    }

    public async delete(item: IUser | number): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof item === "number") {
            return (await databaseService.getQueryBuilder(DatabaseTables.Users).delete().where({ id: item })) > 0;
        } else if (item.id) {
            return (await databaseService.getQueryBuilder(DatabaseTables.Users).delete().where({ id: item.id })) > 0;
        }

        return false;
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
            vipLevel: userResult.vipLevel,
            vipExpiry: userResult.vipExpiry ? new Date(userResult.vipExpiry) : undefined,
            vipLastRequest: userResult.vipLastRequest ? new Date(userResult.vipLastRequest) : undefined,
            vipPermanentRequests: userResult.vipPermanentRequests ?? 0,
            userLevel: userResult.userLevel,
            vipLevelKey: userResult.vipLevelKey,
            dropboxAccessToken: userResult.dropboxAccessToken,
            dropboxRefreshToken: userResult.dropboxRefreshToken,
            twitchUserProfile: {
                username: userResult.username,
                displayName: userResult.profileDisplayName,
                id: userResult.profileId,
                profileImageUrl: userResult.profileImageUrl,
            },
        };

        return this.decryptUser(user);
    }

    private mapDBMultipleUsers(userResult: any[]): IUser[] {
        let users: IUser[] = [];
        userResult.forEach((user) => {
            users.push(this.mapDBUserToUser(user));
        });
        return users;
    }

    private encryptUser(user: IUser): IUser {
        const userData = { ...user };
        userData.accessToken = CryptoHelper.encryptString(userData.accessToken);
        userData.refreshToken = CryptoHelper.encryptString(userData.refreshToken);
        userData.spotifyRefresh = CryptoHelper.encryptString(userData.spotifyRefresh);
        userData.streamlabsToken = CryptoHelper.encryptString(userData.streamlabsToken);
        userData.streamlabsRefresh = CryptoHelper.encryptString(userData.streamlabsRefresh);
        userData.dropboxAccessToken = CryptoHelper.encryptString(userData.dropboxAccessToken);
        userData.dropboxRefreshToken = CryptoHelper.encryptString(userData.dropboxRefreshToken);
        return userData;
    }

    private decryptUser(user: IUser): IUser {
        user.accessToken = CryptoHelper.decryptString(user.accessToken);
        user.refreshToken = CryptoHelper.decryptString(user.refreshToken);
        user.spotifyRefresh = CryptoHelper.decryptString(user.spotifyRefresh);
        user.streamlabsRefresh = CryptoHelper.decryptString(user.streamlabsRefresh);
        user.streamlabsToken = CryptoHelper.decryptString(user.streamlabsToken);
        user.dropboxAccessToken = CryptoHelper.decryptString(user.dropboxAccessToken);
        user.dropboxRefreshToken = CryptoHelper.decryptString(user.dropboxRefreshToken);
        return user;
    }
}

export default UsersRepository;
