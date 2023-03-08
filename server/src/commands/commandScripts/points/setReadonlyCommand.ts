import { Command } from "../../command";
import { ChannelPointRedemption, IUser, UserLevels } from "../../../models";
import { BotSettings } from "../../../services/botSettingsService";
import { BotContainer } from "../../../inversify.config";
import { ChannelPointRewardService } from "../../../services";
import Logger, { LogType } from "../../../logger";

export default class SetReadonlyCommand extends Command {
    private rewardService: ChannelPointRewardService;

    constructor() {
        super();
        this.minimumUserLevel = UserLevels.Moderator;
        this.rewardService = BotContainer.get(ChannelPointRewardService);
    }

    public async executeInternal(channel: string, user: IUser, isReadonlyEnabled: string): Promise<void> {
        if (isReadonlyEnabled === "") {
            const currentValue = await this.settingsService.getBoolValue(BotSettings.ReadonlyMode);
            await this.twitchService.sendMessage(channel, `Read-only mode: ${currentValue ? "Enabled": "Disabled"}`);
            return;
        }

        await this.settingsService.addOrUpdateSettings({ key: BotSettings.ReadonlyMode, value: isReadonlyEnabled ? "1" : "0" });

        // Disable channel point redemptions if possible.
        try {
            for (const reward of await this.rewardService.getAllChannelRewards()) {
                if (reward.hasOwnership && reward.associatedRedemption === ChannelPointRedemption.Points) {
                    await this.twitchWebService.updateChannelReward(reward.twitchRewardId, { is_enabled: !isReadonlyEnabled });
                }
            }
        } catch (error :any) {
            Logger.err(LogType.Twitch, "Cannot update point redemption status.", error);
        }

        await this.twitchService.sendMessage(channel, isReadonlyEnabled ? "Enabled read-only mode." : "Disabled read-only mode.");
    }

    public async getDescription(): Promise<string> {
        return "Enables or disables read-only mode. Usage: !setReadonly <0|1>";
    }
}
