import { injectable, inject } from "inversify";
import { IUserPrincipal, ProviderType } from "../models/userPrincipal";
import { UsersRepository } from "../database/usersRepository";
import { IUser, ITwitchChatList } from "../models";
import EventLogService from "./eventLogService";
import * as Config from "../config.json";
import { PointLogType } from "../models/pointLog";
import { Logger, LogType } from "../logger";

@injectable()
export class UserService {
    constructor(@inject(UsersRepository) private users: UsersRepository, @inject(EventLogService) private eventLog: EventLogService) {
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
                hasLogin: false,
                vipLevelKey: 1,
                userLevelKey: 1,
            };
        } else {
            newUser = user;
        }

        return await this.users.add(newUser);
    }

    public async addUsers(users: string[] | IUser[]): Promise<Number> {
        if (users.length === 0) {
            return 0;
        }

        if (Array.isArray(users) && typeof users[0] === "string") {
            var newUsers = users.map(
                (name: any): IUser => {
                    return {
                        username: name,
                        points: 0,
                        hasLogin: false,
                        vipLevelKey: 1,
                        userLevelKey: 1,
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
     * Adds or removes the given amount of points to a user.
     * @param {IUser} user The user object to update.
     * @param {points} points Number of points to add or remove (if negative)
     */
    public async changeUserPoints(user: IUser, points: number, eventType: PointLogType): Promise<void> {
        user.points += points;
        await this.users.incrementPoints(user, points, eventType);
    }

    /**
     * Adds or removes the given amount of points to one or more users.
     * @param {IUser} users The users object to update.
     * @param {points} points Number of points to add or remove (if negative)
     */
    public async changeUsersPoints(users: IUser[], points: number, eventType: PointLogType): Promise<void> {
        // TODO: Make actual batch updates through the UsersRepository.
        for (const user of users) {
            user.points += points;
            await this.users.incrementPoints(user, points, eventType);
        }
    }

    /**
     * Adds a specified number of VIP gold months to a user.
     * @param user user to update
     * @param goldWeeks Weeks to add
     */
    public async addVipGoldWeeks(user: IUser, goldWeeks: number) {
        if (isNaN(goldWeeks)) {
            throw new RangeError("Invalid number of VIP gold months provided.");
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

        this.eventLog.addVipGoldAdded(user.username, { weeksAdded: goldWeeks, newExpiry: user.vipExpiry, permanentRequests: user.vipPermanentRequests });
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
    public async addPermanentVip(user: IUser, amount: number) {
        user.vipPermanentRequests = user.vipPermanentRequests ? user.vipPermanentRequests++ : 1;
        this.addVipGoldWeeks(user, amount);
    }

    /**
     * Add users from the chatlist to the database if they do not already exist.
     * @param {ITwitchChatList} chatList A ITwitchChatList object containing the chatlist for a channel.
     */
    public async addUsersFromChatList(chatList: ITwitchChatList): Promise<boolean> {
        // Create a single array of all usernames combined from the various usertypes on the twitch chat list type
        if (!chatList.chatters) {
            return false;
        }
        const combinedChatList = Object.keys(chatList.chatters).reduce((chatterList, key) => {
            const chatters = (chatList.chatters as any)[key] as string[];
            chatters.forEach((user: string) => {
                chatterList.push(user);
            });
            return chatterList;
        }, Array<string>());

        return (await this.addUsers(combinedChatList)) > 0;
    }

    /**
     * Gets a user
     * @param {string} username The username of the user to get.
     */
    public async getUser(username: string): Promise<IUser | undefined> {
        return await this.users.get(username);
    }

    public async getBroadcaster(): Promise<IUser | undefined> {
        return await this.users.get(Config.twitch.broadcasterName);
    }

    public async getUserPrincipal(username: string, providerType: ProviderType): Promise<IUserPrincipal | undefined> {
        const userPrincipal: IUserPrincipal = {
            username,
            accessToken: "",
            refreshToken: "",
            providerType,
        };

        const user: IUser | undefined = await this.getUser(username);
        if (!user) {
            return undefined;
        }

        switch (providerType) {
            case ProviderType.Twitch:
                if (!user.accessToken || !user.refreshToken) {
                    Logger.err(LogType.Twitch, "Twitch tokens are not setup.");
                    return undefined;
                }
                userPrincipal.accessToken = user.accessToken;
                userPrincipal.refreshToken = user.refreshToken;
                userPrincipal.userId = user.twitchProfileKey;
                break;

            case ProviderType.Streamlabs:
                if (!user.streamlabsToken || !user.streamlabsRefresh) {
                    //throw new Error("Streamlabs tokens are not setup");
                    Logger.err(LogType.Streamlabs, "Streamlabs tokens are not setup.");
                    return undefined;
                }
                userPrincipal.accessToken = user.streamlabsToken;
                userPrincipal.refreshToken = user.streamlabsRefresh;
                break;
            default: {
                Logger.err(LogType.Server, `UserPrincipal is not implemented for provider: ${providerType}`);
                return undefined;
            }
        }

        return userPrincipal;
    }
}

export default UserService;
