import { Command } from "../../command";
import { ChannelPointRedemption, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository, UserTaxStreakRepository } from "../../../database";
import { ChannelPointRewardService } from "../../../services";
import Logger, { LogType } from "../../../logger";
import { TaxType } from "../../../models/taxHistory";

export class MyTaxCommand extends Command {
    private taxRepository: UserTaxHistoryRepository;
    private taxStreakRepository: UserTaxStreakRepository;
    private channelPointRewardService: ChannelPointRewardService;

    constructor() {
        super();
        this.taxRepository = BotContainer.get(UserTaxHistoryRepository);
        this.taxStreakRepository = BotContainer.get(UserTaxStreakRepository);
        this.channelPointRewardService = BotContainer.get(ChannelPointRewardService);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const taxChannelReward = await this.channelPointRewardService.getChannelRewardForRedemption(ChannelPointRedemption.Tax);
        if (taxChannelReward && taxChannelReward.id) {

            const paidTaxesCount = await this.taxRepository.getCountForUser(user.id ?? 0, TaxType.ChannelPoints);
            const taxStreak = await this.taxStreakRepository.get(user.id ?? 0);
            const lastTax = await this.taxRepository.getLastTaxPayment(user.id ?? 0);
            const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
            const lastTaxFormatted = lastTax ? ` (last: ${dateFormat.format(new Date(lastTax.taxRedemptionDate))})` : "";

            if (!paidTaxesCount) {
                await this.twitchService.sendMessage(channel, `${user.username}, you have not yet paid taxes.`);
            } else if (taxStreak) {
                await this.twitchService.sendMessage(channel,
                    `${user.username}, you have paid taxes ${paidTaxesCount} times total${lastTaxFormatted}. Your current streak is ${taxStreak?.currentStreak} (longest: ${taxStreak?.longestStreak}).`);
            } else {
                await this.twitchService.sendMessage(channel, `${user.username}, you have paid taxes ${paidTaxesCount} times total${lastTaxFormatted}`);
            }
        } else {
            Logger.warn(LogType.Twitch, "!mytax cannot be used because tax is not configured");
        }
    }

    public async getDescription(): Promise<string> {
        return "Displays your current tax track record. Usage: !mytax";
    }
}

export default MyTaxCommand;
