import { injectable, inject } from 'inversify';
import UsersRepository from '../database/usersRepository';
import { IUser } from '../models/user';
import { ITwitchChatList } from '../models/twitchApi';

@injectable()
export class UserService {
    constructor(@inject(UsersRepository) private users: UsersRepository) {
        // Empty
    }

    /**
     * Adds a new user if the user doesn't already exist.
     * @param {string | IUser} user Username of the user to add, or the User object
     */
    public async addUser(user: string | IUser): Promise<void> {
        let newUser: IUser = {} as IUser;
        if (typeof user === 'string') {
            newUser = {
                username: user,
                points: 0,
                hasLogin: false,
            };
        } else {
            newUser = user;
        }

        await this.users.add(newUser);
    }

    /**
     * Update a user with new data
     * @param {IUser} user The updated user object for the user to update.
     */
    public async updateUser(user: IUser): Promise<void> {
        await this.users.update(user);
    }

    /**
     * Add users from the chatlist to the database if they do not already exist.
     * @param {ITwitchChatList} chatList A ITwitchChatList object containing the chatlist for a channel.
     */
    public async addUAllUsersFromChatList(chatList: ITwitchChatList): Promise<void> {
        // Create a single array of all usernames combined from the various usertypes on the twitch chat list type
        if (chatList.chatter_count > 0){
            const combinedChatList = Object.values(chatList.chatters)
                                            .flat()
                                            .forEach((chatter: string) => {
                                                this.addUser(chatter);
                                            })
        }
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
