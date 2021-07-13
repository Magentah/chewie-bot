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
    private settingsService: BotSettingsService;
    private userService: UserService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);
        this.cardsRepository = BotContainer.get(CardsRepository);
        this.settingsService = BotContainer.get(BotSettingsService);
    }

    public async executeInternal(channel: string, user: IUser, cardName: string): Promise<void> {
        const pointsForCard = parseInt(await this.settingsService.getValue(BotSettings.CardRecyclePoints), 10);

        if (await this.cardsRepository.takeCardFromStack(user, cardName)) {
            await this.userService.changeUserPoints(user, pointsForCard, PointLogType.CardRecycle);
            await this.twitchService.sendMessage(channel, Lang.get("cards.cardrecycled", user.username, cardName, pointsForCard));
        } else {
            await this.twitchService.sendMessage(channel, Lang.get("cards.trading.notowningcard", user.username, cardName));
        }
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "recycle", commandName: "recyclecard" },
        ];
    }

    public getDescription(): string {
        return `Disposes of the specified card and grants a certain amount of points in return. Usage: !recycle <card name>`;
    }
}
