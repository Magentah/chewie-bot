import { Command } from "../../command";
import { ICommandAlias, IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { SonglistRepository } from "../../../database";

export default class HasSongCommand extends Command {
    private songlist: SonglistRepository;

    constructor() {
        super();
        this.songlist = BotContainer.get(SonglistRepository);
    }

    public async executeInternal(channel: string, user: IUser, ...args: string[]): Promise<void> {
        const searchSubject = args.join(" ");
        if (!searchSubject) {
            this.twitchService.sendMessage(channel, `${user.username}, you did not specify a search subject.`);
            return;
        }

        const songs = await this.songlist.getBySearchSubject(searchSubject);

        if (songs && songs.length > 0) {
            let more = "";
            if (songs.length > 1) {
                more = ` (${songs.length - 1} more)`;
            }

            this.twitchService.sendMessage(channel, `Found in songlist${more}: ${songs[0].album ? songs[0].album : songs[0].artist} - ${songs[0].title}`);
        } else {
            this.twitchService.sendMessage(channel, `Nothing found in songlist for "${searchSubject}".`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Checks if a particular song is in the song list and puts it into chat. Usage: !hasSong <search subject>`;
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "isInList", commandName: "hasSong" },
            { alias: "inList", commandName: "hasSong" },
        ];
    }
}
