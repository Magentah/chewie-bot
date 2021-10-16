import { Command } from "../command";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { SonglistRepository } from "../../database";
import { UserService } from "../../services";

export default class RandomUserFavoriteCommand extends Command {
    private songlist: SonglistRepository;
    private userService: UserService;

    constructor() {
        super();
        this.songlist = BotContainer.get(SonglistRepository);
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, forUserName: string, ...args: string[]): Promise<void> {
        if (!forUserName) {
            this.twitchService.sendMessage(channel, `${user.username}, please specify a user name.`);
            return;
        }

        const searchSubject = args.join(" ");
        const forUser = await this.userService.getUser(forUserName);
        if (!forUser) {
            this.twitchService.sendMessage(channel, `${forUserName} is not a valid user.`);
            return;
        }

        const song = await this.songlist.getRandom(searchSubject, forUser);

        if (song) {
            this.twitchService.sendMessage(channel, `Song for ${user.username}: ${song.album ? song.album : song.artist} - ${song.title}`);
        } else if (searchSubject) {
            this.twitchService.sendMessage(channel, `${forUserName} has no favorites for "${searchSubject}" in the songlist.`);
        } else {
            this.twitchService.sendMessage(channel, `${forUserName} has no favorites in the songlist.`);
        }
    }

    public getDescription(): string {
        return `Selects a random (of all / by genre / by search subject) favorite song from a specific user's favorites and puts it into chat. Usage: !randomuserfav <username> [<genre or search subject>]`;
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "randomuserfav", commandName: "randomUserFavorite" },
        ];
    }
}
