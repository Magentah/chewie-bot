import { ICommandAlias, IUser, UserLevels } from "../../models/";
import { UserService } from "../../services";
import { Command } from "../command";
import { BotContainer } from "../../inversify.config";

export class AddPermanentVipCommand extends Command {
    private userService: UserService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);

        this.minimumUserLevel = UserLevels.Broadcaster;
    }

    public async executeInternal(channel: string, user: IUser, targetUsername: string, amount: number) {
        let targetUser = await this.userService.getUser(targetUsername);
        if (!targetUser || !amount) {
            this.twitchService.sendMessage(channel, "Try again with !addpermanentvip <user> <amount>");
            return;
        }

        if (!targetUser) {
            if (await this.twitchService.userExistsInChat(channel, targetUsername)) {
                targetUser = await this.userService.getUser(targetUsername);
            }
        }

        if (!targetUser) {
            this.twitchService.sendMessage(channel, `${targetUsername} is not a valid user.`);
            return;
        }

        await this.userService.addPermanentVip(targetUser, amount);
        this.twitchService.sendMessage(channel, `Added ${amount} non-expiring VIP gold request(s) to ${targetUsername}.`);
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "addpermavip", commandName: "addpermanentvip" },
        ];
    }
}

export default AddPermanentVipCommand;
