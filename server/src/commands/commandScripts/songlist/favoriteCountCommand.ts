import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { SonglistRepository } from "../../../database";
import { UserService } from "../../../services";

export default class FavoriteCountCommand extends Command {
    private songlistRepository: SonglistRepository;
    private userService: UserService;

    constructor() {
        super();
        this.songlistRepository = BotContainer.get(SonglistRepository);
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, targetUserName: string): Promise<void> {
        let targetUser = user;
        if (targetUserName) {
            const userInfo = await this.userService.getUser(targetUserName);
            if (userInfo) {
                targetUser = userInfo;
            } else {
                this.twitchService.sendMessage(channel, `${targetUserName} is not a valid user.`);
                return;
            }
        }

        if (targetUser.id) {
            const favorites = await this.songlistRepository.countFavorites(targetUser.id);
            if (favorites === 0) {
                this.twitchService.sendMessage(channel, `${targetUser.username} did not favorite any songs.`);
            } else {
                this.twitchService.sendMessage(channel, `${targetUser.username} has ${favorites} favorite songs.`);
            }
        }
    }

    public async getDescription(): Promise<string> {
        return `Displays number of favorite songs for a user. Usage: !favoriteCount [<user>]`;
    }
}
