import { Command } from "../../command";
import { CardsRepository } from "./../../../database";
import { BotSettingsService, UserService } from "./../../../services";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { BotSettings } from "../../../services/botSettingsService";
import { Lang } from "../../../lang";
import { PointLogType } from "../../../models/pointLog";

/**
 * Trade in any card for a certain amount of chews (to get rid of duplicate cards).
 */
export default class RecycleCardCommand extends Command {
    private cardsRepository: CardsRepository;
    private userService: UserService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);
        this.cardsRepository = BotContainer.get(CardsRepository);
    }

    public async executeInternal(channel: string, user: IUser, cardName: string, count: number): Promise<void> {
        if (await this.isReadOnly(channel)) {
            return;
        }

        // Determine number of cards to recycle (at least one).
        const numberToTake = count && Number.isInteger(count) ? Math.max(1, count) : 1;

        const card = await this.cardsRepository.getByName(cardName);
        if (!card) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.notowningcard", user.username, cardName));
            return;
        }

        const numberOfCards = await this.cardsRepository.getCountByCard(user, card);
        if (!numberOfCards) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.notowningcard", user.username, cardName));
            return;
        }

        const pointsForCard = parseInt(await this.settingsService.getValue(BotSettings.CardRecyclePoints), 10);

        // Always keep one card unless only one is supposed to be recycled.
        let remainingCards = numberToTake === 1 ? 1 : Math.min(numberOfCards - 1, numberToTake);
        let cardsRecycled = 0;
        while (remainingCards > 0) {
            if (await this.cardsRepository.takeCardFromStack(user, cardName)) {
                await this.userService.changeUserPoints(user, pointsForCard, PointLogType.CardRecycle);
                cardsRecycled++;
            }

            remainingCards--;
        }

        if (cardsRecycled > 0) {
            await this.twitchService.sendMessage(channel, Lang.get("cards.cardrecycled", user.username, cardName, pointsForCard * cardsRecycled));
        } else if (numberOfCards === 1) {
            await this.twitchService.sendMessage(channel, Lang.get("cards.trading.onecardleft", user.username, cardName));
        } else {
            await this.twitchService.sendMessage(channel, Lang.get("cards.trading.notowningcard", user.username, cardName));
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "recycle", commandName: "recyclecard" },
        ];
    }

    public async getDescription(): Promise<string> {
        return `Disposes of a card and grants a certain amount of points in return. When recycling more than one card, one will always remain in your collection. Usage: !recycle <card name> [<amount>]`;
    }
}
