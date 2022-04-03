import { Command } from "../command";
import { EventLogType, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { CardsRepository, EventLogsRepository, SonglistRepository } from "../../database";

export default class MyStatsCommand extends Command {
    private eventLogsRepository: EventLogsRepository;
    private songlistRepository: SonglistRepository;
    private cardsRepository: CardsRepository;
    private readonly Arguments = "SongRequest|Sudoku|Redeem|SongPlayed|Songlist|Cards";

    constructor() {
        super();
        this.eventLogsRepository = BotContainer.get(EventLogsRepository);
        this.songlistRepository = BotContainer.get(SonglistRepository);
        this.cardsRepository = BotContainer.get(CardsRepository);
    }

    public async executeInternal(channel: string, user: IUser, eventTypeArgument: string): Promise<void> {
        if (!eventTypeArgument) {
            this.twitchService.sendMessage(channel, `No event type specified (options: ${this.Arguments})`);
            return;
        }

        const eventType = eventTypeArgument.toLowerCase();

        if (Object.values(EventLogType).includes(eventType as EventLogType)) {
            const count = await this.eventLogsRepository.getCount(eventType as EventLogType, user);
            this.twitchService.sendMessage(channel, `${user.username}, your stats for ${eventTypeArgument}: ${count}`);
        } else if (eventType === "songlist" && user.id) {
            const countSongs = await this.songlistRepository.countAttributions(user.id);
            this.twitchService.sendMessage(channel, `${user.username}, number of songlisted requests: ${countSongs}`);
        } else if (eventType === "cards" && user.id) {
            const countCards = await this.cardsRepository.getCountByUser(user);
            this.twitchService.sendMessage(channel, `${user.username}, total number of cards collected: ${countCards}`);
        } else {
            this.twitchService.sendMessage(channel, `Unknown event type \"${eventTypeArgument}\"`);
            return;
        }
    }

    public getDescription(): string {
        return `Outputs the number of times an event has been caused by the user. Usage: !myStats <${this.Arguments}>`;
    }
}
