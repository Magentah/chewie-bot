import { Command } from "../command";
import { BotSettingsService, EventLogService, UserService } from "../../services";
import { AchievementType, EventLogType, ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";
import { BotSettings } from "../../services/botSettingsService";
import SeasonsRepository from "../../database/seasonsRepository";
import EventAggregator from "../../services/eventAggregator";

enum RedeemVariation {
    Catjam = "catjam",
    Clap = "clap",
    Comfy = "comfy"
}

export default class RedeemCommand extends Command {
    private userService: UserService;
    private eventLogService: EventLogService;
    private eventAggregator: EventAggregator;
    private seasonsRepository: SeasonsRepository;

    private readonly Variations = {
        [RedeemVariation.Clap]: {emote: "chewieClap", url: "https://i.imgur.com/yCfzpSf.gif"},
        [RedeemVariation.Catjam]: {emote: "catJAM", url: "https://i.imgur.com/Yhp8rDt.gif"},
        [RedeemVariation.Comfy]: {emote: "chewieMmm", url: "https://i.imgur.com/Kwrb7nS.gif"},
    };

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.eventLogService = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
        this.seasonsRepository = BotContainer.get(SeasonsRepository);
    }

    public async executeInternal(channel: string, user: IUser, variation: string): Promise<void> {
        const data = this.Variations[variation as RedeemVariation];
        if (!data) {
            return;
        }

        const cost = parseInt(await this.settingsService.getValue(BotSettings.RedeemCost), 10);
        if (cost) {
            if (!await this.checkReadOnly(channel)) {
                return;
            }
        }

        if (user.points >= cost) {
            await this.userService.changeUserPoints(user, -cost, `${PointLogType.Redeem}-${variation}`);
            await this.twitchService.triggerAlert("redeem", variation, data.url);
            await this.twitchService.sendMessage(channel, `${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote} ${data.emote}`);

            // Check for achievements
            await this.eventLogService.addRedeem(user, variation);
            const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
            const count = await this.eventLogService.getCount(EventLogType.RedeemCommand, user);
            const seasonalCount = await this.eventLogService.getCount(EventLogType.RedeemCommand, user, currentSeasonStart);

            const msg = { user, type: AchievementType.AnimationRedeems, count, seasonalCount };
            this.eventAggregator.publishAchievement(msg);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "redeemclap", commandName: "redeem", commandArguments: RedeemVariation.Clap },
            { alias: "redeemcatjam", commandName: "redeem", commandArguments: RedeemVariation.Catjam },
            { alias: "redeemcomfy", commandName: "redeem", commandArguments: RedeemVariation.Comfy },
        ];
    }

    public getDescription(): string {
        return `Triggers an animation in return for points. Usage: !redeemclap | !redeemcatjam | !redeemcomfy`;
    }
}
