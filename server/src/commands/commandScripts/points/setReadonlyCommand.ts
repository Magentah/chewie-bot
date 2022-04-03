import { Command } from "../../command";
import { IUser, UserLevels } from "../../../models";
import { BotSettings } from "../../../services/botSettingsService";

export default class SetReadonlyCommand extends Command {
    constructor() {
        super();
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, enabled: string): Promise<void> {
        if (enabled === "") {
            const currentValue = await this.settingsService.getBoolValue(BotSettings.ReadonlyMode);
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
