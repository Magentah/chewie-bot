import { Command } from "../command";
import { BotSettingsService, EventLogService, UserService } from "../../services";
import { AchievementType, EventLogType, ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";
import { BotSettings } from "../../services/botSettingsService";
import EventAggregator from "../../services/eventAggregator";

enum RedeemVariation {
    Catjam = "catjam",
    Clap = "clap",
    Comfy = "comfy"
}

export default class RedeemCommand extends Command {
    private userService: UserService;
    private settingsService: BotSettingsService;
    private eventLogService: EventLogService;
    private eventAggregator: EventAggregator;

    private readonly Variations = {
        [RedeemVariation.Clap]: {emote: "chewieClap", url: "https://i.imgur.com/yCfzpSf.gif"},
        [RedeemVariation.Catjam]: {emote: "catJAM", url: "https://i.imgur.com/Yhp8rDt.gif"},
        [RedeemVariation.Comfy]: {emote: "chewieMmm", url: "https://i.imgur.com/Kwrb7nS.gif"},
    };

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.settingsService = BotContainer.get(BotSettingsService);
        this.eventLogService = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
    }

    public async executeInternal(channel: string, user: IUser, variation: string): Promise<void> {
        const data = this.Variations[variation as RedeemVariation];
        if (!data) {
            return;
        }

        const cost = parseInt(await this.settingsService.getValue(BotSettings.RedeemCost), 10);

        if (user.points >= cost) {
            await this.userService.changeUserPoints(user, -cost, `${PointLogType.Redeem}-${variation}`);
            await this.twitchService.triggerAlert("redeem", variation, data.url);
            await this.twitchService.sendMessage(channel, `${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote}`);

            await this.eventLogService.addRedeem(user, variation);
            const count = await this.eventLogService.getCount(EventLogType.RedeemCommand, user.username);

            const msg = { user, type: AchievementType.AnimationRedeems, count };
            this.eventAggregator.publishAchievement(msg);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "redeemclap", commandName: "redeem", commandArguments: [RedeemVariation.Clap] },
            { alias: "redeemcatjam", commandName: "redeem", commandArguments: [RedeemVariation.Catjam] },
            { alias: "redeemcomfy", commandName: "redeem", commandArguments: [RedeemVariation.Comfy] },
        ];
    }

    public getDescription(): string {
        return `Triggers an animation in return for points. Usage: !redeemclap | !redeemcatjam | !redeemcomfy`;
    }
}
