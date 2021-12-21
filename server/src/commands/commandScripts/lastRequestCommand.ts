import { Command } from "../command";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import { EventLogsRepository } from "../../database";

export default class LastRequestCommand extends Command {
    private eventLogs: EventLogsRepository;

    constructor() {
        super();

        this.eventLogs = BotContainer.get(EventLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser,  ...args: string[]): Promise<void> {
        const searchSubject = args.join(" ");
        if (!searchSubject) {
            this.twitchService.sendMessage(channel, `${user.username}, you did not specify a search subject.`);
            return;
        }

        const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });

        const songQueue = await this.eventLogs.searchRequests(searchSubject);
        if (songQueue.length > 0 && songQueue[0].time) {
            const eventData = JSON.parse(songQueue[0].data);
            const song = eventData.song;
            if (song) {
                // Check how many times this exact song has been requested.
                let counter = 0;
                for (const otherSong of songQueue) {
                    const data = JSON.parse(otherSong.data);
                    if (data.song.title === song.title) {
                        counter++;
                    }
                }

                this.twitchService.sendMessage(channel, `»${song.title}« last requested by ${song.requestedBy} (${dateFormat.format(new Date(songQueue[0].time))} and ${counter} times total)`);
            }
        } else {
            this.twitchService.sendMessage(channel, `Nothing found in the request history for "${searchSubject}".`);
        }
    }

    public getDescription(): string {
        return `Outputs the first song in the song request history and its requester in chat. Usage: !lastRequest <search subject>`;
    }
}
