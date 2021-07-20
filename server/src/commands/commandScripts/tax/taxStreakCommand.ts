import { Command } from "../../command";
import { ChannelPointRedemption, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository } from "../../../database";
import { ChannelPointRewardService } from "../../../services";
import Logger, { LogType } from "../../../logger";

export class TaxStreakCommand extends Command {
    private taxRepository: UserTaxHistoryRepository;
    private channelPointRewardService: ChannelPointRewardService;

    constructor() {
        super();
        this.taxRepository = BotContainer.get(UserTaxHistoryRepository);
        this.channelPointRewardService = BotContainer.get(ChannelPointRewardService);
    }

    public async executeInternal(channel: string, user: IUser, numberOfUsers: number): Promise<void> {
        const userCount = numberOfUsers ? Math.min(25, numberOfUsers) : 10;

        const taxChannelReward = await this.channelPointRewardService.getChannelRewardForRedemption(ChannelPointRedemption.Tax);
        if (taxChannelReward && taxChannelReward.id) {
            let result = "Longest taxpaying streaks are: ";
            const numFormat = new Intl.NumberFormat();
            const taxPayers = await this.taxRepository.getLongestTaxStreaks(userCount);

            if (taxPayers.length > 0) {
                for (const topUser of taxPayers) {
                    result += `${numFormat.format(topUser.longestStreak)} streams (${topUser.username}) / `
                }

                this.twitchService.sendMessage(channel, result.substr(0, result.length - 2));
            } else {
                this.twitchService.sendMessage(channel, "No taxpayers so far.");
            }
        } else {
            Logger.warn(LogType.Twitch, "!taxstreak cannot be used because tax is not configured");
        }
    }

    public getDescription(): string {
        return `Displays the top tax payers (by longest streak paid). Usage: !taxstreak <number>`;
    }
}

export default TaxStreakCommand;
