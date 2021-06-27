import { Command } from "../../command";
import { ChannelPointRedemption, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository } from "../../../database";
import { ChannelPointRewardService } from "../../../services";
import Logger, { LogType } from "../../../logger";

export class TaxboardCommand extends Command {
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
            let result = "Top taxpayers: ";
            let counter = 1;
            const numFormat = new Intl.NumberFormat();
            const taxPayers = await this.taxRepository.getTopTaxpayers(taxChannelReward.twitchRewardId, userCount);

            if (taxPayers.length > 0) {
                for (const topUser of taxPayers) {
                    result += `${counter++}. ${topUser.username}: ${numFormat.format(topUser.taxCount * taxChannelReward.cost)} / `
                }

                this.twitchService.sendMessage(channel, result.substr(0, result.length - 2));
            } else {
                this.twitchService.sendMessage(channel, "No taxpayers so far.");
            }
        } else {
            Logger.warn(LogType.Twitch, "!taxboard cannot be used because tax is not configured");
        }
    }
}

export default TaxboardCommand;
