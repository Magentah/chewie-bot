import { Command } from "../../command";
import { BotSettingsService } from "../../../services";
import { IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { BotSettings } from "../../../services/botSettingsService";

export default class SetReadonlyCommand extends Command {
    private settingsService: BotSettingsService;

    constructor() {
        super();
        this.settingsService = BotContainer.get(BotSettingsService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, enabled: string): Promise<void> {
        if (enabled === "") {
            const currentValue = await this.settingsService.getValue(BotSettings.ReadonlyMode);
            this.twitchService.sendMessage(channel, `Read-only mode: ${currentValue ? "Enabled": "Disabled"}`);
            return;
        }

        await this.settingsService.addOrUpdateSettings({ key: BotSettings.ReadonlyMode, value: enabled ? "1" : "0" });
        this.twitchService.sendMessage(channel, enabled ? "Enabled read-only mode." : "Disabled read-only mode.");
    }

    public getDescription(): string {
        return `Enables or disables read-only mode. Usage: !setReadonly <0|1>`;
    }
}
