import { Command } from "../command";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import BotSettingsService, { BotSettings } from "../../services/botSettingsService";

export class TimeCommand extends Command {
    private settingsService: BotSettingsService;

    constructor() {
        super();

        this.settingsService = BotContainer.get(BotSettingsService);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        const timezone = await this.settingsService.getValue(BotSettings.Timezone);

        const options: any = timezone ? { timeStyle: "long", timeZone: timezone } : { timeStyle: "long" };
        this.twitchService.sendMessage(channel, "Current time: " + new Intl.DateTimeFormat("en-US", options).format(new Date()));
    }
}

export default TimeCommand;
