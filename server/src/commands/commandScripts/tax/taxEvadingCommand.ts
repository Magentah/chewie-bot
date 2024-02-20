import { Command } from "../../command";
import { EventLogType, EventTypes, IUser } from "../../../models";
import { EventLogService, UserService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { BotSettings } from "../../../services/botSettingsService";
import { EventLogsRepository, StreamActivityRepository } from "../../../database";
import { PointLogType } from "../../../models/pointLog";

export default class TaxEvadingCommand extends Command {
    private eventLogService: EventLogService;
    private userService: UserService;
    private streamActivityRepository: StreamActivityRepository;
    private eventLogs: EventLogsRepository;

    constructor() {
        super();
        this.eventLogService = BotContainer.get(EventLogService);
        this.userService = BotContainer.get(UserService);
        this.streamActivityRepository = BotContainer.get(StreamActivityRepository);
        this.eventLogs = BotContainer.get(EventLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        // When someone uses that emote, let's check if they are allowed to.
        // Users who got caught this stream or are #1 on the leaderboard are not.

        let penalty = false;
        const topTaxEvaders = await this.eventLogs.getTopTaxEvaders(1);
        if (topTaxEvaders.length === 1 && topTaxEvaders[0].username === user.username) {
            penalty = true;
        } else {
            const lastOnline = await this.streamActivityRepository.getLatestForEvent(EventTypes.StreamOnline);
            if (lastOnline) {
                const evasionCount = await this.eventLogService.getCount(EventLogType.TaxEvasion, user, new Date(lastOnline.dateTimeTriggered));
                if (evasionCount > 0) {
                    penalty = true;
                }
            }
        }

        // Afterwards, penalize with a small amount of chews and a short timeout if needed.
        // If user has no chews, take them straight to jail.
        if (penalty) {
            const taxPenalty = await this.settingsService.getIntValue(BotSettings.TaxEvasionPenalty);
            if (user.points >= taxPenalty) {
                if (taxPenalty) {
                    await this.userService.changeUserPoints(user, -taxPenalty, PointLogType.TaxEvasion);
                    await this.twitchWebService.banUser(user.username, 1, `${user.username} broke their back trying to dodge bullets`, true);
                    await this.twitchService.sendMessage(channel, `${user.username} broke their back trying to dodge bullets (-${taxPenalty} chews) NOPERS`);
                }
            } else {
                const penaltyDuration = await this.settingsService.getIntValue(BotSettings.TaxTimeoutDurationForInsubordination);
                await this.twitchWebService.banUser(user.username, penaltyDuration, "Tax evasion", true);
                await this.twitchService.sendMessage(channel, `Loud, broke, and shameless, ${user.username} was taken straight to jail chewieJail`);
            }
        }
    }

    /**
     * Execute command whenever someone uses the taxEvading emote in chat.
     */
    public shouldExecuteOnMessage(message: string): boolean {
        return message.indexOf("taxEvading") !== -1;
    }

    public async getDescription(): Promise<string> {
        return "Evading taxes??";
    }
}
