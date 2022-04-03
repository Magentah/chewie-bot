import { Command } from "../../command";
import { CardsRepository } from "./../../../database";
import { EventLogService, EventService, UserService } from "./../../../services";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";
import CardTradingEvent from "../../../events/cardTradingEvent";

/**
 * Trade a card for chews or a different card from another user.
 */
export default class OfferCommand extends Command {
    private cardsRepository: CardsRepository;
    private userService: UserService;
    private eventService: EventService;
    private eventLogService: EventLogService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);
        this.cardsRepository = BotContainer.get(CardsRepository);
        this.eventService = BotContainer.get(EventService);
        this.eventLogService = BotContainer.get(EventLogService);
    }

    public async executeInternal(channel: string, user: IUser, cardName: string, cardNameOrChews: string, targetUserName: string): Promise<void> {
        if (!await this.checkReadOnly(channel)) {
            return;
        }

        if (!cardName) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.nocardoffered", user.username));
            return;
        }

        if (!cardNameOrChews) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.missingargument", user.username));
            return;
        }

        // If target user is specified, get the user's details.
        let targetUser;
        if (targetUserName) {
            targetUser = await this.userService.getUser(targetUserName);
            if (!targetUser) {
                this.twitchService.sendMessage(channel, Lang.get("cards.trading.userunknown", targetUserName));
                return;
            }
        }

        const cardWanted = await this.cardsRepository.getByName(cardNameOrChews);
        const pointsWanted = Number(cardNameOrChews);

        // Abort if card does not exist at all.
        if (cardWanted === undefined && isNaN(pointsWanted)) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.cardnotexists", user.username, cardNameOrChews));
            return;
        }

        // Abort if card wanted is same as card offered.
        if (cardWanted && cardWanted.name.toLowerCase() === cardName.toLowerCase()) {
            this.twitchService.sendMessage(channel, Lang.get("cards.trading.nosamecard", user.username, cardNameOrChews));
            return;
        }

        const trading = new CardTradingEvent(this.twitchService, this.userService, this.eventService, this.eventLogService,
            this.cardsRepository, user, cardName, pointsWanted, cardWanted?.name, targetUser);
        trading.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

        function isEvent(event: string | CardTradingEvent): event is CardTradingEvent {
            return (event as CardTradingEvent).state !== undefined;
        }

        const eventResult = this.eventService.startEvent(trading, user);
        if (!isEvent(eventResult)) {
            this.twitchService.sendMessage(channel, eventResult);
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "trade", commandName: "offer" },
        ];
    }

    public getDescription(): string {
        return `Offers a card you own for trading. Usage: !offer <card> <wanted card or amount chews> [<target user>]`;
    }
}
