import { Command } from "../command";
import { BotSettingsService, EventLogService, UserService } from "../../services";
import { AchievementType, EventLogType, ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";
import { BotSettings } from "../../services/botSettingsService";
import EventAggregator from "../../services/eventAggregator";

export default class RedeemCommand extends Command {
    private userService: UserService;
    private settingsService: BotSettingsService;
    private eventLogService: EventLogService;
    private eventAggregator: EventAggregator;
    private cost: number = -1;

    private comfyUrl: string = "https://i.imgur.com/Kwrb7nS.gif";
    private clapUrl: string = "https://i.imgur.com/yCfzpSf.gif";
    private catjamUrl: string = "https://i.imgur.com/Yhp8rDt.gif";

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.settingsService = BotContainer.get(BotSettingsService);
        this.eventLogService = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
    }

    public async executeInternal(channel: string, user: IUser, variation: string, emote: string, url: string): Promise<void> {
        if (this.cost < 0) {
            this.cost = parseInt(await this.settingsService.getValue(BotSettings.RedeemCost), 10);
        }

        if (user.points >= this.cost) {
            await this.userService.changeUserPoints(user, -this.cost, `${PointLogType.Redeem}-${variation}`);
            await this.twitchService.triggerAlert("redeem", variation, url);
            await this.twitchService.sendMessage(channel, `${emote} ${emote} ${emote} ${emote} ${emote} ${emote} ${emote}`);

            await this.eventLogService.addRedeem(user, variation);
            const count = await this.eventLogService.getCount(EventLogType.RedeemCommand, user.username);

            const msg = { user, type: AchievementType.AnimationRedeems, count };
            this.eventAggregator.publishAchievement(msg);
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
