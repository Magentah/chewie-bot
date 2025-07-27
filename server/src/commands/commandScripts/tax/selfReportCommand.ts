import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { EventLogsRepository } from "../../../database";

export default class SelfReportCommand extends Command {
    private eventLogs: EventLogsRepository;

    constructor() {
        super();
        this.eventLogs = BotContainer.get(EventLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        // Get the number of times the user caught themselves with !taxinspector
        const selfReportCount = await this.eventLogs.getSelfReportCount(user);
        const numFormat = new Intl.NumberFormat();
        let message: string;
        if (selfReportCount > 0) {
            if (selfReportCount === 1) {
                message = "You caught yourself evading taxes only once. I assume you learned your lesson!";
            } else if (selfReportCount < 5) {
                message = `You have self-reported ${numFormat.format(selfReportCount)} times. Are we sure you have the right job?`;
            } else {
                message = `You have self-reported ${numFormat.format(selfReportCount)} times. At this rate, you might be the only tax inspector who audits themselves more than anyone else!`;
            }
        } else {
            message = "You have never caught yourself evading taxes. Either you're squeaky clean or...not actually a tax inspector?";
        }
        await this.twitchService.sendMessage(channel, message);
    }

    public async getDescription(): Promise<string> {
        return "Displays the number of times you caught yourself using !taxinspector. Usage: !selfreport";
    }
}
