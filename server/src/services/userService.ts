import { injectable, inject } from "inversify";
import { IUserPrincipal, ProviderType } from "../models/userPrincipal";
import { UsersRepository } from "../database/usersRepository";
import { IUser, AchievementType, UserLevels, SocketMessageType, IUserAuth } from "../models";
import EventLogService from "./eventLogService";
import * as Config from "../config.json";
import { PointLogReason, PointLogType } from "../models/pointLog";
import { Logger, LogType } from "../logger";
import PointLogsRepository from "../database/pointLogsRepository";
import EventAggregator from "./eventAggregator";
import WebsocketService from "../services/websocketService";
import BotSettingsService, { BotSettings } from "../services/botSettingsService";

@injectable()
export class UserService {
    constructor(
        @inject(UsersRepository) private users: UsersRepository,
        @inject(EventLogService) private eventLog: EventLogService,
        @inject(EventAggregator) private eventAggregator: EventAggregator,
        @inject(WebsocketService) private websocketService: WebsocketService,
        @inject(PointLogsRepository) private pointsLog: PointLogsRepository,
        @inject(BotSettingsService) private settings: BotSettingsService) {
        // Empty
    }

    /**
     * Adds a new user if the user doesn't already exist.
     * @param {string | IUser} user Username of the user to add, or the User object
     */
    public async addUser(user: string | IUser): Promise<IUser> {
        let newUser: IUser = {} as IUser;
        if (typeof user === "string") {
            newUser = {
                username: user,
                points: 0,
                vipLevelKey: 1,
                userLevel: UserLevels.Viewer,
            };
        } else {
            newUser = user;
        }

        return await this.users.add(newUser);
    }

    public async addUsers(users: string[] | IUser[]): Promise<number> {
        if (users.length === 0) {
            return 0;
        }

        if (Array.isArray(users) && typeof users[0] === "string") {
            const newUsers = users.map(
                (name: any): IUser => {
                    return {
                        username: name,
                        points: 0,
                        vipLevelKey: 1,
                        userLevel: UserLevels.Viewer,
                    };
                }
            );
            return (await this.users.addMultiple(newUsers)).length;
        } else if (Array.isArray(users) && typeof users[0] === typeof "IUser") {
            return (await this.users.addMultiple(users as IUser[])).length;
        } else {
            return 0;
        }
    }

    /**
     * Updates one or more users with new data
     * @param {IUser} users The updated user objects for the users to update.
     */
    public async updateUser(...users: IUser[]): Promise<void> {
        // TODO: Make actual batch updates through the UsersRepository.
        for (const user of users) {
            await this.users.update(user);
        }
    }

    /**
     * Resets a user's points, VIP gold and point log.
     * @param userData User to reset
     */
    public async resetUser(userData: IUser) {
        userData.vipExpiry = undefined;
        userData.vipPermanentRequests = 0;
        await this.updateUser(userData);
        await this.pointsLog.reset(userData);
        await this.changeUserPoints(userData, -userData.points, PointLogType.Reset);
    }

    /**
     * Moves data from one user to another.
     */
    public async moveUserData(fromUser: IUser, toUser: IUser): Promise<void> {
        await this.users.moveUserData(fromUser, toUser);
    }

    /**
     * Renames an existing user.
     * @param {IUser} user User to be renamed.
     */
    public async renameUser(user: IUser, newUserName: string): Promise<void> {
        await this.users.renameUser(user,newUserName);
    }

    /**
     * Adds or removes the given amount of points to a user.
     * @param {IUser} user The user object to update.
     * @param {points} points Number of points to add or remove (if negative)
     */
    public async changeUserPoints(user: IUser, points: number, eventType: PointLogType | string, reason = PointLogReason.None): Promise<void> {
        points = Math.round(points);
        user.points += points;
        await this.users.incrementPoints(user, points, eventType, reason);

        // No achievement processing necessary if ponts are being reset.
        if (user.points > 0) {
            // count == seasonalCount since points are always reset. Only difference between seasonal and non-seasonal
            // achievements here would be that non-seasonal achievements stay permanently across seasons.
            this.eventAggregator.publishAchievement({ user, count: user.points, type: AchievementType.Points, seasonalCount: user.points });
        }

        this.websocketService.send({ type: SocketMessageType.PointsChanged, message: "Points changed", data: reason });
    }

    /**
     * Adds or removes the given amount of points to one or more users.
     * @param {IUser} users The users object to update.
     * @param {points} points Number of points to add or remove (if negative)
     */
    public async changeUsersPoints(users: IUser[], points: number, eventType: PointLogType, reason = PointLogReason.None): Promise<void> {
        // TODO: Make actual batch updates through the UsersRepository.
        for (const user of users) {
            await this.changeUserPoints(user, points, eventType, reason);
        }
    }

    /**
     * Adds a specified number of VIP gold months to a user.
     * @param user user to update
     * @param goldWeeks Weeks to add
     */
    public async addVipGoldWeeks(user: IUser, goldWeeks: number, reason: string) {
        if (isNaN(goldWeeks)) {
            throw new RangeError("Invalid number of VIP gold weeks provided.");
        }

        if (goldWeeks === 0) {
            return;
        }

        let vipStartDate = new Date(new Date().toDateString());

        // If VIP status still active, renew starting at the VIP end date
        if (user.vipExpiry && user.vipExpiry >= vipStartDate) {
            // Start next day after expiry because expiration date is inclusive.
            vipStartDate = user.vipExpiry;
            vipStartDate.setDate(user.vipExpiry.getDate() + 1);
        }

        // Add 4 weeks.
        vipStartDate.setDate(vipStartDate.getDate() + goldWeeks * 7 - 1);
        user.vipExpiry = vipStartDate;

        await this.users.updateVipExpiry(user);

        await this.eventLog.addVipGoldAdded(user, { weeksAdded: goldWeeks, newExpiry: user.vipExpiry, permanentRequests: user.vipPermanentRequests, reason });
    }

    /**
     * Adds a number of permanent (non-expiring) VIP requests.
     * For each request, the requests counter will be incremented *and* VIP gold duration will be extended for one week.
     * When redeeming gold, it will always be deducted from the amount of permanent requests.
     * This way you can not keep your permanent request indefinitely when adding more gold, but
     * you will also not lose the permanent request when using a normal VIP gold request in terms of total
     * number of requests that you can make..
     * @param user user to update
     * @param amount Number of requests to grant
     */
    public async addPermanentVip(user: IUser, amount: number, reason: string) {
        user.vipPermanentRequests = user.vipPermanentRequests ? (user.vipPermanentRequests + amount) : amount;

        const usePermanentRequests = await this.settings.getBoolValue(BotSettings.GoldStatusPermanentRequests);
        if (usePermanentRequests) {
            // Not changing VIP expiry date here to limit available requests to the permanent ones
            await this.users.updateVipExpiry(user);
            await this.eventLog.addVipGoldAdded(user, { weeksAdded: 0, newExpiry: user.vipExpiry, permanentRequests: user.vipPermanentRequests, reason });
        } else {
            await this.addVipGoldWeeks(user, amount, reason);
        }
    }

    /**
     * Gets a user
     * @param {string} username The username of the user to get.
     */
    public async getUser(username: string): Promise<IUser | undefined> {
        const name = username.startsWith("@") ? username.substring(1) : username;
        return await this.users.get(name);
    }

    /**
     * Gets a user by ID.
     * @param {number} id The ID of the user to get.
     */
    public async getUserById(id: number): Promise<IUser | undefined> {
        return await this.users.getById(id);
    }

    /**
     * Deletes a user
     * @param {IUser} username The username of the user to delete.
     */
    public async deleteUser(user: IUser): Promise<boolean> {
        return await this.users.delete(user);
    }

    public async getBroadcaster(): Promise<IUser | undefined> {
        return await this.users.get(Config.twitch.broadcasterName);
    }

    public async updateAuth(ctx: IUserAuth): Promise<void> {
        return await this.users.updateUserAuth(ctx);
    }

    public async deleteAuth(username: string, provider: ProviderType) : Promise<boolean> {
        const user: IUser | undefined = await this.getUser(username);
        if (!user?.id) {
            return false;
        }
        return await this.users.deleteUserAuth(user, provider);
    }

    public async getUserPrincipal(username: string, providerType: ProviderType): Promise<IUserPrincipal | undefined> {
        const user: IUser | undefined = await this.getUser(username);
        if (!user?.id) {
            return undefined;
        }

        const userAuth = await this.users.getUserAuth(user.id, providerType);

        const userPrincipal: IUserPrincipal = {
            username,
            accessToken: "",
            refreshToken: "",
            type: providerType,
            userId: user.id,
            scope: userAuth?.scope ?? ""
        };

        switch (providerType) {
            case ProviderType.Twitch:
                if (!userAuth?.accessToken || !userAuth?.refreshToken) {
                    Logger.err(LogType.Twitch, "Twitch tokens are not setup.");
                    return undefined;
                }
                userPrincipal.accessToken = userAuth.accessToken;
                userPrincipal.refreshToken = userAuth.refreshToken;
                userPrincipal.foreignUserId = user.twitchProfileKey;
                break;

            default:
                if (!userAuth?.accessToken || !userAuth?.refreshToken) {
                    Logger.err(LogType.OAuth, `${providerType} tokens are not setup.`);
                    return undefined;
                }
                userPrincipal.accessToken = userAuth.accessToken;
                userPrincipal.refreshToken = userAuth.refreshToken;
                break;
        }

        return userPrincipal;
    }
}

export default UserService;
