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
            if (await this.twitchWebService.userExists(targetUsername)) {
                targetUser = await this.userService.getUser(targetUsername);
            }
        }

        if (!targetUser) {
            this.twitchService.sendMessage(channel, `${targetUsername} is not a valid user.`);
            return;
        }

        await this.userService.addPermanentVip(targetUser, amount, `Added by ${user.username}`);
        this.twitchService.sendMessage(channel, `Added ${amount} non-expiring VIP gold request(s) to ${targetUsername}.`);
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "addpermavip", commandName: "addpermanentvip" },
        ];
    }

    public async getDescription(): Promise<string> {
        return `Adds a number of permanent VIP requests to a user. Also increases the VIP expiry by <amount> * one week. Usage: !addpermanentvip <user> <amount>`;
    }
}

export default AddPermanentVipCommand;
