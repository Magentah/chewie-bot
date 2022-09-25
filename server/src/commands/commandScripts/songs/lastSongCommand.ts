import { Command } from "../../command";
import { EventLogType, ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { EventLogsRepository } from "../../../database";
import { IArchivedSong } from "../../../models/song";

export default class LastSongCommand extends Command {
    private eventLogsRepository: EventLogsRepository;

    constructor() {
        super();

        this.eventLogsRepository = BotContainer.get(EventLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const lastPlayed = await this.eventLogsRepository.getLast(EventLogType.SongPlayed, 1);
        if (lastPlayed.length > 0) {
            const song = JSON.parse(lastPlayed[0].data).song as IArchivedSong;
            this.twitchService.sendMessage(channel, `Previously played: ${song.title} requested by ${lastPlayed[0].username}`);
        } else {
            this.twitchService.sendMessage(channel, "No song found in the song history.");
        }
    }

    public getAliases(): ICommandAlias[] {
        return [{ alias: "lastPlayed", commandName: "lastSong" }];
    }

    public async getDescription(): Promise<string> {
        return `Outputs the most recently played song.`;
    }
}
