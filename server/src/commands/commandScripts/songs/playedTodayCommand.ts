import { Command } from "../../command";
import { EventLogType, EventTypes, ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { EventLogsRepository, StreamActivityRepository } from "../../../database";

export default class PlayedTodayCommand extends Command {
    private eventLogsRepository: EventLogsRepository;
    private streamActivityRepository: StreamActivityRepository;

    constructor() {
        super();

        this.eventLogsRepository = BotContainer.get(EventLogsRepository);
        this.streamActivityRepository = BotContainer.get(StreamActivityRepository);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const lastOnline = await this.streamActivityRepository.getLatestForEvent(EventTypes.StreamOnline);
        const lastPlayedCount = await this.eventLogsRepository.getCountTotal(EventLogType.SongPlayed, new Date(lastOnline?.dateTimeTriggered ?? 0));
        if (lastPlayedCount > 0) {
            this.twitchService.sendMessage(channel, `${lastPlayedCount} songs have been played this stream.`);
        } else {
            this.twitchService.sendMessage(channel, "No songs have been played this stream.");
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "today", commandName: "playedToday" }, { alias: "played", commandName: "playedToday" }];
    }

    public getDescription(): string {
        return `Outputs the number of songs that have been played this stream.`;
    }
}
