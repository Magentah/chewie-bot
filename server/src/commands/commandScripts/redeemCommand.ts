import { Command } from "../command";
import { EventLogService, UserService } from "../../services";
import { AchievementType, EventLogType, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { PointLogType } from "../../models/pointLog";
import { BotSettings } from "../../services/botSettingsService";
import SeasonsRepository from "../../database/seasonsRepository";
import EventAggregator from "../../services/eventAggregator";
import RedemptionsRepository from "../../database/redemptionsRepository";

export default class RedeemCommand extends Command {
    private userService: UserService;
    private eventLogService: EventLogService;
    private eventAggregator: EventAggregator;
    private seasonsRepository: SeasonsRepository;
    private redemptionsRepository: RedemptionsRepository;

    constructor() {
        super();
        this.userService = BotContainer.get(UserService);
        this.eventLogService = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
        this.seasonsRepository = BotContainer.get(SeasonsRepository);
        this.redemptionsRepository = BotContainer.get(RedemptionsRepository);
    }

    public async executeInternal(channel: string, user: IUser, variation: string): Promise<void> {
        if (!variation) {
            return;
        }

        const data = await this.redemptionsRepository.getByName(variation);
        if (!data) {
            return;
        }

        const cost = parseInt(await this.settingsService.getValue(BotSettings.RedeemCost), 10);
        if (cost) {
            if (await this.isReadOnly(channel)) {
                return;
            }
        }

        if (user.points >= cost) {
            await this.userService.changeUserPoints(user, -cost, `${PointLogType.Redeem}-${variation}`);
            await this.twitchService.triggerAlert("redeem", variation, this.redemptionsRepository.addUrl(data).url);
            if (data.message) {
                await this.twitchService.sendMessage(channel, data.message);
            }

            // Check for achievements
            await this.eventLogService.addRedeem(user, variation);
            const currentSeasonStart = (await this.seasonsRepository.getCurrentSeason()).startDate;
            const count = await this.eventLogService.getCount(EventLogType.RedeemCommand, user);
            const seasonalCount = await this.eventLogService.getCount(EventLogType.RedeemCommand, user, currentSeasonStart);

            const msg = { user, type: AchievementType.AnimationRedeems, count, seasonalCount };
            this.eventAggregator.publishAchievement(msg);
        }
    }

    public async getDescription(): Promise<string> {
        const options: string[] = [];
        for (const variation of await this.redemptionsRepository.getList()) {
            options.push(variation.name);
        }

        return `Triggers an animation in return for points. Usage: !redeem [${options.join(",")}]`;
    }
}
