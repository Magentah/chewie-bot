import { inject, injectable } from "inversify";
import { EventLogsRepository } from "../database/eventLogsRepository";
import { IEventLog, EventLogType, IUser, ISong } from "../models";
import * as Config from "../config.json";
import { IArchivedSong } from "../models/song";

@injectable()
export class EventLogService {
    constructor(@inject(EventLogsRepository) private eventLogs: EventLogsRepository) {
        // Empty
    }

    public async addSongRequest(user: IUser | string, song: ISong): Promise<void> {
        // Always log since needed for achievements.
        const songData: IArchivedSong = {
            title: song.title,
            duration: song.duration?.milliseconds(),
            requestedBy: song.requestedBy,
            requestSource: song.requestSource,
            songSource: song.source,
            url: song.sourceUrl,
            previewUrl: song.previewUrl
        };

        const data = {
            message: "Song has been requested.",
            song: songData
        };

        const log = this.createLog(EventLogType.SongRequest, user, data);
        await this.eventLogs.add(log);
    }

    public async addSudoku(user: IUser) {
        // Always log since needed for achievements.
        const log = this.createLog(EventLogType.Sudoku, user, {});
        await this.eventLogs.add(log);
    }

    public async addRedeem(user: IUser, type: string) {
        // Always log since needed for achievements.
        const log = this.createLog(EventLogType.RedeemCommand, user, { type });
        await this.eventLogs.add(log);
    }

    public async addTaxEvasion(user: IUser, duration: number, inspector: IUser) {
        const log = this.createLog(EventLogType.TaxEvasion, user, { duration, taxinspector: inspector.username, taxinspectorId: inspector.id });
        await this.eventLogs.add(log);
    }

    public async addSongPlayed(user: IUser | string, song: ISong): Promise<void> {
        if (!Config.log.enabledEventLogs.song.played) {
            return;
        }

        const songData: IArchivedSong = {
            title: song.title,
            duration: song.duration?.milliseconds(),
            requestedBy: song.requestedBy,
            requestSource: song.requestSource,
            songSource: song.source,
            url: song.sourceUrl,
            previewUrl: song.previewUrl
        };

        const data = {
            message: "Song has been played.",
            song: songData
        };

        const log = this.createLog(EventLogType.SongPlayed, user, data);
        await this.eventLogs.add(log);
    }

    public async addSongRemoved(user: IUser | string, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.song.removed) {
            return;
        }
        const log = this.createLog(EventLogType.SongRemoved, user, data);
        await this.eventLogs.add(log);
    }

    public async addChannelPointRedemption(user: IUser, data: object | object[]): Promise<void> {
        const log = this.createLog(EventLogType.PointRewardRedemption, user, data);
        await this.eventLogs.add(log);
    }

    public async addDuel(user: string, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.event.duel) {
            return;
        }
        const log = this.createLog(EventLogType.Duel, user, data);
        await this.eventLogs.add(log);
    }

    public async addBankheist(users: string, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.event.bankheist) {
            return;
        }
        const log = this.createLog(EventLogType.Bankheist, users, data);
        await this.eventLogs.add(log);
    }

    public async addCommand(user: IUser, data: object | object[]): Promise<void> {
        const log = this.createLog(EventLogType.Command, user, data);
        await this.eventLogs.add(log);
    }

    public async addVipGoldAdded(user: IUser, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.song.gold) {
            return;
        }
        const log = this.createLog(EventLogType.GoldAdded, user, data);
        await this.eventLogs.add(log);
    }

    public async addTwitchGiftSub(user: IUser, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.twitch.subs) {
            return;
        }

        const log = this.createLog(EventLogType.GiftSub, user, data);
        await this.eventLogs.add(log);
    }

    public async addTwitchCommunityGiftSub(user: IUser, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.twitch.subs) {
            return;
        }

        const log = this.createLog(EventLogType.CommunityGiftSub, user, data);
        await this.eventLogs.add(log);
    }

    public async addStreamlabsEventReceived(user: IUser | string, type: EventLogType, data: object | object[]) {
        if (!Config.log.enabledEventLogs.streamlabs.events) {
            return;
        }

        const log = this.createLog(type, user, data);
        await this.eventLogs.add(log);
    }

    public async addUserRename(user: IUser, oldUserName: string, newUserName: string) {
        if (!Config.log.enabledEventLogs.admin.renameuser) {
            return;
        }

        const log = this.createLog(EventLogType.RenameUser, user, { oldUserName, newUserName });
        await this.eventLogs.add(log);
    }

    public async addCardTrading(user: IUser | string, data: object | object[]): Promise<void> {
        if (!Config.log.enabledEventLogs.event.cardtrading) {
            return;
        }
        const log = this.createLog(EventLogType.CardTrading, user, data);
        await this.eventLogs.add(log);
    }

    public async addDebug(data: object | object[]): Promise<void> {
        const log = this.createLog(EventLogType.Debug, "", data);
        await this.eventLogs.add(log);
    }

    public async getCount(type: EventLogType, user: IUser, sinceDate: Date = new Date(0)) : Promise<number> {
        return await this.eventLogs.getCount(type, user, sinceDate);
    }

    public async getTaxPenaltiesSince(sinceDate: Date): Promise<string[]> {
        return await this.eventLogs.getUsers(EventLogType.TaxEvasion, sinceDate);
    }

    private createLog(type: EventLogType, user: IUser | string | undefined, data: object | object[]): IEventLog {
        if (typeof(user) === "string") {
            const log: IEventLog = {
                type,
                username: user,
                userId: undefined,
                data: JSON.stringify(data),
            };

            return log;
        } else {
            const log: IEventLog = {
                type,
                username: user ? user.username : "",
                userId: user?.id ?? 0,
                data: JSON.stringify(data),
            };

            return log;
        }
    }
}

export default EventLogService;
