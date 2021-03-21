import { inject, injectable } from "inversify";
import { EventLogsRepository } from "../database";
import { IEventLog, EventLogType } from "../models";

@injectable()
export class EventLogService {
    constructor(@inject(EventLogsRepository) private eventLogs: EventLogsRepository) {
        // Empty
    }

    public async addSongRequest(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.SongRequest, username, data);
        this.eventLogs.add(log);
    }

    public async addChannelPointRedemption(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.PointRewardRedemption, username, data);
        this.eventLogs.add(log);
    }

    public async addDuel(username: string, data: object | Array<object>): Promise<void> {
        const log = this.createLog(EventLogType.Duel, username, data);
        this.eventLogs.add(log);
    }

    public async addBankheist(username: string, data: object | Array<object>): Promise<void> {
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
