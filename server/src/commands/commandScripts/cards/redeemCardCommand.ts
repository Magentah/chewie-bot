import { Command } from "../../command";
import { CardsRepository } from "./../../../database";
import { BotSettingsService, UserService } from "./../../../services";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { BotSettings } from "../../../services/botSettingsService";
import { Lang } from "../../../lang";
import { PointLogType } from "../../../models/pointLog";

/**
 * Trade in a certain amount of chews for a random sub card.
 */
export default class RedeemCardCommand extends Command {
    private cardsRepository: CardsRepository;
    private settingsService: BotSettingsService;
    private userService: UserService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);
        this.cardsRepository = BotContainer.get(CardsRepository);
        this.settingsService = BotContainer.get(BotSettingsService);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const cost = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemCost), 10);
        if (cost > user.points) {
            this.twitchService.sendMessage(channel, Lang.get("cards.insufficientpoints", user.username));
            return;
        }

        // Check if user already has redeemed too many cards this week.
        const cardsPerWeek = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemPerWeek), 10);
        if (cardsPerWeek > 0) {
            const cardsRedeemed = await this.cardsRepository.getRedeemedCardCount(user, new Date());
            if (cardsRedeemed >= cardsPerWeek) {
                await this.twitchService.sendMessage(channel, Lang.get("cards.redeemlimitexceeded", user.username, cardsRedeemed));
                return;
            }
        }

        const card = await this.cardsRepository.redeemRandomCard(user);
        if (card) {
            await this.userService.changeUserPoints(user, -cost, PointLogType.RedeemCard);
            await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemed", user.username, card.name));
        }
    }
}
