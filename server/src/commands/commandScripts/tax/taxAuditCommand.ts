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
            await this.twitchService.sendMessage(channel, `${user.username}, please specify a user name.`);
            return;
        }

        const targetUser = await this.userService.getUser(username);
        if (!targetUser) {
            await this.twitchService.sendMessage(channel, `${user.username}, the user \"${username}\" does not exist.`);
            return;
        }

        let taxesPaid = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let taxesPaidForStream = false;
        let previousStreamDate = 0;
        let lastTaxMissDate = 0;
        let lastTaxRedemptionId = 0;
        let lastTaxDate = 0;
        const sixHours = 6 * 60 * 60 * 1000;

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
                lastTaxDate = event.date;
            } else if (event.event === EventTypes.StreamOnline) {
                const restartedStream = new Date(event.date).getTime() - new Date(previousStreamDate).getTime() < sixHours;

                if (taxesPaidForStream) {
                    // Here: User paid taxes for first stream, then stream restarted after
                    if (restartedStream) {
                        // Don't set taxesPaidForStream to false
                        continue;
                    }
                }
                else {
                    // Reset streak only if stream didn't restart.
                    // Here: Considering second stream in a row before user got chance to pay taxes
                    if (!restartedStream) {
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
            if (lastTaxRedemptionId) {
                await this.taxStreakRepository.updateStreak(targetUser.id, lastTaxRedemptionId, currentStreak, longestStreak);
                await this.twitchService.sendMessage(channel, `Tax streak for ${targetUser.username} saved: Current streak: ${currentStreak}, longest streak: ${longestStreak}`);
            } else {
                await this.twitchService.sendMessage(channel, `No tax streak for ${targetUser.username} saved since no taxes have been paid.`);
            }
        } else {
            const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });
            const taxesPaidText = lastTaxDate ? `Taxes paid: ${taxesPaid} (last: ${dateFormat.format(new Date(lastTaxDate))})` : `Taxes paid: ${taxesPaid}`;
            await this.twitchService.sendMessage(channel,
                `Audit for ${targetUser.username}. ${taxesPaidText}, current streak: ${currentStreak}, longest streak: ${longestStreak}, last miss: ${lastTaxMissDate ? dateFormat.format(new Date(lastTaxMissDate)) : "-"}`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Audits the daily taxes paid for a specific user. Usage: !taxaudit <user> ["save"]`;
    }
}
