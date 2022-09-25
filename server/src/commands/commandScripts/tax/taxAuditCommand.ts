import { Command } from "../../command";
import { EventTypes, IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository, UserTaxStreakRepository } from "../../../database";
import { UserService } from "../../../services";

export default class TaxAuditCommand extends Command {
    private taxRepository: UserTaxHistoryRepository;
    private taxStreakRepository: UserTaxStreakRepository;
    private userService: UserService;

    constructor() {
        super();
        this.taxRepository = BotContainer.get(UserTaxHistoryRepository);
        this.taxStreakRepository = BotContainer.get(UserTaxStreakRepository);
        this.userService = BotContainer.get(UserService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, username: string, save: "save" | undefined): Promise<void> {
        if (!username) {
            this.twitchService.sendMessage(channel, `${user.username}, please specify a user name.`);
            return;
        }

        const targetUser = await this.userService.getUser(username);
        if (!targetUser) {
            this.twitchService.sendMessage(channel, `${user.username}, the user \"${username}\" does not exist.`);
            return;
        }

        let taxesPaid = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let taxesPaidForStream = false;
        let previousStreamDate = 0;
        let lastTaxMissDate = 0;
        let lastTaxRedemptionId = 0;

        const taxAuditHistory = await this.taxRepository.getTaxAudit(targetUser);
        for (const event of taxAuditHistory) {
            if (event.event === "tax") {
                // Increase streak only once per stream.
                if (!taxesPaidForStream) {
                    currentStreak++;
                }

                taxesPaid++;
                taxesPaidForStream = true;
                lastTaxRedemptionId = event.id;
            } else if (event.event === EventTypes.StreamOnline) {
                if (!taxesPaidForStream) {
                    const sixHours = 6 * 60 * 60 * 1000;
                    // Reset streak only if stream didn't restart.
                    if (new Date(event.date).getTime() - new Date(previousStreamDate).getTime() >= sixHours) {
                        longestStreak = Math.max(currentStreak, longestStreak);
                        currentStreak = 0;
                        lastTaxMissDate = previousStreamDate;
                    }
                }

                taxesPaidForStream = false;
                previousStreamDate = event.date;
            }
        }

        longestStreak = Math.max(currentStreak, longestStreak);

        // Optional: Save audited tax.
        if (save === "save" && targetUser.id) {
            await this.taxStreakRepository.updateStreak(targetUser.id, lastTaxRedemptionId, currentStreak, longestStreak);
            this.twitchService.sendMessage(channel, `Tax streak for ${targetUser.username} saved: Current streak: ${currentStreak}, longest streak: ${longestStreak}`);
        } else {
            const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });
            this.twitchService.sendMessage(channel, `Audit for ${targetUser.username}. Taxes paid: ${taxesPaid}, current streak: ${currentStreak}, longest streak: ${longestStreak}, last miss: ${lastTaxMissDate ? dateFormat.format(new Date(lastTaxMissDate)) : "-"}`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Audits the daily taxes paid for a specific user. Usage: !taxaudit <user> ["save"]`;
    }
}
