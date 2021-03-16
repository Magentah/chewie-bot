import { injectable, inject } from "inversify";
import { UsersRepository } from "../database/usersRepository";
import { IUser, ITwitchChatList } from "../models";

@injectable()
export class UserService {
    constructor(@inject(UsersRepository) private users: UsersRepository) {
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

        await this.users.add(newUser);

        return await this.getUser(newUser.username);
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
    public async changeUserPoints(user: IUser, points: number): Promise<void> {
        user.points += points;
        await this.users.incrementPoints(user, points);
    }

    /**
     * Adds or removes the given amount of points to one or more users.
     * @param {IUser} users The users object to update.
     * @param {points} points Number of points to add or remove (if negative)
     */
    public async changeUsersPoints(users: IUser[], points: number): Promise<void> {
        // TODO: Make actual batch updates through the UsersRepository.
        for (const user of users) {
            user.points += points;
            await this.users.incrementPoints(user, points);
        }
    }

    /**
     * Add users from the chatlist to the database if they do not already exist.
     * @param {ITwitchChatList} chatList A ITwitchChatList object containing the chatlist for a channel.
     */
    public async addUsersFromChatList(chatList: ITwitchChatList): Promise<void> {
        // Create a single array of all usernames combined from the various usertypes on the twitch chat list type
        if (!chatList.chatters) {
            return;
        }
        const combinedChatList = Object.keys(chatList.chatters).reduce((chatterList, key) => {
            const chatters = (chatList.chatters as any)[key] as string[];
            chatters.forEach((user: string) => {
                chatterList.push(user);
            });
            return chatterList;
        }, Array<string>());

        combinedChatList.forEach((val) => {
            this.addUser(val);
        });
    }

    /**
     * Gets a user
     * @param {string} username The username of the user to get.
     */
    public async getUser(username: string): Promise<IUser> {
        return await this.users.get(username);
    }
}

export default UserService;
