import { inject, injectable } from "inversify";
import { EventLogsRepository } from "../database/eventLogsRepository";
import { IEventLog, EventLogType } from "../models";
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
        this.eventLogs.add(log);
    }

    public async addSongPlayed(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.played) {
            return;
        }
        const log = this.createLog(EventLogType.SongPlayed, username, data);
        this.eventLogs.add(log);
    }

    public async addSongRemoved(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.song.removed) {
            return;
        }
        const log = this.createLog(EventLogType.SongRemoved, username, data);
        this.eventLogs.add(log);
    }

    public async addChannelPointRedemption(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.PointRewardRedemption, username, data);
        this.eventLogs.add(log);
    }

    public async addDuel(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.event.duel) {
            return;
        }
        const log = this.createLog(EventLogType.Duel, username, data);
        this.eventLogs.add(log);
    }

    public async addBankheist(username: string, data: object | Array<object>): Promise<void> {
        if (!Config.log.enabledEventLogs.event.bankheist) {
            return;
        }
        const log = this.createLog(EventLogType.Bankheist, username, data);
        this.eventLogs.add(log);
    }

    public async addCommand(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.Command, username, data);
        this.eventLogs.add(log);
    }

    private createLog(type: EventLogType, username: string, data: object | Array<object>): IEventLog {
        const log: IEventLog = {
            type,
            username,
            data,
        };

        return log;
    }
}

export default EventLogService;
