import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { EventLogsRepository } from "../../../database";

export default class TaxevadersCommand extends Command {
    private eventLogs: EventLogsRepository;

    constructor() {
        super();
        this.eventLogs = BotContainer.get(EventLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser, numberOfUsers: number): Promise<void> {
        const userCount = numberOfUsers && Number.isInteger(numberOfUsers) ? Math.min(25, numberOfUsers) : 10;

        const evaders = await this.eventLogs.getTopTaxEvaders(userCount);
        let result = "Top tax evaders: ";
        let counter = 1;
        const numFormat = new Intl.NumberFormat();

        if (evaders.length > 0) {
            for (const topUser of evaders) {
                result += `${counter++}. ${topUser.username}: ${numFormat.format(topUser.count)} / `
            }

            await this.twitchService.sendMessage(channel, result.substring(0, result.length - 2));
        } else {
            await this.twitchService.sendMessage(channel, "No tax evaders so far.");
        }
    }

    public async getDescription(): Promise<string> {
        return "Displays the top tax evaders (by amount of times caught). Usage: !taxevaders <number>";
    }
}
