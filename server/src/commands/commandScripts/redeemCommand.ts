import { Command } from "../command";
import { UserService } from "../../services";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";

export default class RedeemCommand extends Command {
    private userService: UserService;
    private cost: number = 500;

    private comfyUrl: string = "https://i.imgur.com/Kwrb7nS.gif";
    private clapUrl: string = "https://i.imgur.com/yCfzpSf.gif";
    private catjamUrl: string = "https://i.imgur.com/Yhp8rDt.gif";

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, variation: string, emote: string, url: string): Promise<void> {
        if (user.points >= this.cost) {
            await this.userService.changeUserPoints(user, -this.cost, `${PointLogType.Redeem}-${variation}`);
            await this.twitchService.triggerAlert("redeem", variation, url);
            await this.twitchService.sendMessage(channel, `${emote} ${emote} ${emote} ${emote} ${emote} ${emote} ${emote}`);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "redeemclap", commandName: "redeem", commandArguments: ["clap", "Clap", this.clapUrl] },
            { alias: "redeemcatjam", commandName: "redeem", commandArguments: ["catjam", "catJAM", this.catjamUrl] },
            { alias: "redeemcomfy", commandName: "redeem", commandArguments: ["comfy", "chewieMmm", this.comfyUrl] },
        ];
    }
}
