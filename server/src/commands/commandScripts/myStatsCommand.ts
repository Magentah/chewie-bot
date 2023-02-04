import { Command } from "../command";
import { EventLogType, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { CardsRepository, EventLogsRepository, SonglistRepository, PointLogsRepository } from "../../database";
import { PointLogReason, PointLogType } from "../../models/pointLog";

export default class MyStatsCommand extends Command {
    private eventLogsRepository: EventLogsRepository;
    private songlistRepository: SonglistRepository;
    private cardsRepository: CardsRepository;
    private readonly Arguments = "SongRequest, Sudoku, Redeem, SongPlayed, Songlist, Cards, Duel, Arena";
    private readonly pointsLog: PointLogsRepository;

    constructor() {
        super();
        this.eventLogsRepository = BotContainer.get(EventLogsRepository);
        this.songlistRepository = BotContainer.get(SonglistRepository);
        this.cardsRepository = BotContainer.get(CardsRepository);
        this.pointsLog = BotContainer.get(PointLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser, eventTypeArgument: string): Promise<void> {
        if (!eventTypeArgument) {
            await this.twitchService.sendMessage(channel, `No event type specified (options: ${this.Arguments})`);
            return;
        }

        const eventType = eventTypeArgument.toLowerCase();

        if (eventType === "duel" && user.id) {
            const duelsWon = await this.pointsLog.getCount(user, PointLogType.Duel, PointLogReason.Win);
            const duelsDraw = await this.pointsLog.getCount(user, PointLogType.Duel, PointLogReason.Draw);
            const refundsTotal = await this.pointsLog.getCount(user, PointLogType.Duel, PointLogReason.Refund);
            const startedTotal = await this.pointsLog.getCount(user, PointLogType.Duel, PointLogReason.None);
            const completedDuels = startedTotal - refundsTotal;
            await this.twitchService.sendMessage(channel, `${user.username}, won ${duelsWon} out of ${completedDuels} duels (draws: ${duelsDraw})`);
        } else if (eventType === "arena" && user.id) {
            const arena1 = await this.pointsLog.getCount(user, PointLogType.Arena, PointLogReason.FirstPlace);
            const arena2 = await this.pointsLog.getCount(user, PointLogType.Arena, PointLogReason.SecondPlace);
            const arena3 = await this.pointsLog.getCount(user, PointLogType.Arena, PointLogReason.ThirdPlace);
            const arenaRefundsTotal = await this.pointsLog.getCount(user, PointLogType.Arena, PointLogReason.Refund);
            const arenaStartedTotal = await this.pointsLog.getCount(user, PointLogType.Arena, PointLogReason.None);
            const completedArenas = arenaStartedTotal - arenaRefundsTotal;
            await this.twitchService.sendMessage(channel, `${user.username}, participated in ${completedArenas} arenas. Score: 1st [${arena1}], 2nd [${arena2}], 3rd [${arena3}]`);
        } else if (Object.values(EventLogType).includes(eventType as EventLogType)) {
            const count = await this.eventLogsRepository.getCount(eventType as EventLogType, user);
            await this.twitchService.sendMessage(channel, `${user.username}, your stats for ${eventTypeArgument}: ${count}`);
        } else if (eventType === "songlist" && user.id) {
            const countSongs = await this.songlistRepository.countAttributions(user.id);
            await this.twitchService.sendMessage(channel, `${user.username}, number of songlisted requests: ${countSongs}`);
        } else if (eventType === "cards" && user.id) {
            const countCards = await this.cardsRepository.getCountByUser(user);
            const countUniqueCards = await this.cardsRepository.getUniqueCardsCount(user);
            const countUpgrades = await this.cardsRepository.getUniqueUpgradesCount(user);
            await this.twitchService.sendMessage(channel, `${user.username}, total number of cards collected: ${countCards} (unique: ${countUniqueCards}). Upgraded cards: ${countUpgrades}`);
        } else {
            await this.twitchService.sendMessage(channel, `Unknown event type \"${eventTypeArgument}\"`);
            return;
        }
    }

    public async getDescription(): Promise<string> {
        return `Outputs the number of times an event has been caused by the user. Usage: !myStats <${this.Arguments}>`;
    }
}
