import { inject, injectable } from "inversify";
import { EventLogsRepository } from "../database/eventLogsRepository";
import { IEventLog, EventLogType, IUser } from "../models";
import * as Config from "../config.json";

@injectable()
export class EventLogService {
    constructor(@inject(EventLogsRepository) private eventLogs: EventLogsRepository) {
        // Empty
    }

    public async addSongRequest(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.requested) {
            return;
        }
        const log = this.createLog(EventLogType.SongRequest, username, data);
        await this.eventLogs.add(log);
    }

    public async addSongPlayed(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.played) {
            return;
        }
        const log = this.createLog(EventLogType.SongPlayed, username, data);
        await this.eventLogs.add(log);
    }

    public async addSongRemoved(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.removed) {
            return;
        }
        const log = this.createLog(EventLogType.SongRemoved, username, data);
        await this.eventLogs.add(log);
    }

    public async addChannelPointRedemption(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.PointRewardRedemption, username, data);
        await this.eventLogs.add(log);
    }

    public async addDuel(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.event.duel) {
            return;
        }
        const log = this.createLog(EventLogType.Duel, username, data);
        await this.eventLogs.add(log);
    }

    public async addBankheist(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.event.bankheist) {
            return;
        }
        const log = this.createLog(EventLogType.Bankheist, username, data);
        await this.eventLogs.add(log);
    }

    public async addCommand(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.Command, username, data);
        await this.eventLogs.add(log);
    }

    public async addVipGoldAdded(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.gold) {
            return;
        }
        const log = this.createLog(EventLogType.GoldAdded, username, data);
        await this.eventLogs.add(log);
    }

    public async addTwitchGiftSub(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.twitch.subs) {
            return;
        }

        const log = this.createLog(EventLogType.GiftSub, username, data);
        await this.eventLogs.add(log);
    }

    public async addTwitchCommunityGiftSub(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.twitch.subs) {
            return;
        }

        const log = this.createLog(EventLogType.CommunityGiftSub, username, data);
        await this.eventLogs.add(log);
    }

    public async addStreamlabsEventReceived(username: string, type: EventLogType, data: object | Array<object>) {
        if (!Config.log.enabledEventLogs.streamlabs.events) {
            return;
        }

        const log = this.createLog(type, username, data);
        await this.eventLogs.add(log);
    }

    public async addUserRename(user: IUser, oldUserName: string, newUserName: string) {
        if (!Config.log.enabledEventLogs.admin.renameuser) {
            return;
        }

        const log = this.createLog(EventLogType.RenameUser, user.username, { oldUserName, newUserName });
        await this.eventLogs.add(log);
    }

    private createLog(type: EventLogType, username: string, data: object | Array<object>): IEventLog {
        const log: IEventLog = {
            type,
            username,
            data: JSON.stringify(data),
        };

        return log;
    }
}

export default EventLogService;
