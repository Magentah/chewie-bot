import { Command } from "../command";
import { IUser, UserLevels } from "../../models";
import { BotContainer } from "../../inversify.config";
import { UserService } from "../../services";
import { Lang } from "../../lang";

export class VipCommand extends Command {
    private userService: UserService;

    constructor() {
        super();

        this.userService = BotContainer.get(UserService);
    }

    public async executeInternal(channel: string, user: IUser, targetUserName: string): Promise<void> {
        let userToCheck = user;

        if (targetUserName) {
            // Allow mods to see the status of any user.
            if (user.userLevel && user.userLevel >= UserLevels.Moderator) {
                const targetUser = await this.userService.getUser(targetUserName);
                if (targetUser) {
                    userToCheck = targetUser;
                } else {
                    this.twitchService.sendMessage(channel, Lang.get("points.userunknown", targetUserName));
                    return;
                }
            }
        }

        const todayDate = new Date(new Date().toDateString());
        let vipInfo = "";
        let lastReqInfo = "";
        const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
        const dateFormatWithWeek = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });
        const dateFormatWeekday = new Intl.DateTimeFormat("en", { weekday: "long" });

        if (userToCheck.vipExpiry) {
            const expiryDate = new Date(userToCheck.vipExpiry);
            if (expiryDate < todayDate) {
                vipInfo += `Expired on: ${dateFormat.format(expiryDate)}.`;
            } else {
                const renewDate = new Date(expiryDate);
                renewDate.setDate(renewDate.getDate() + 1);
                vipInfo += `Can be used until: ${dateFormat.format(expiryDate)} (renews each ${dateFormatWeekday.format(renewDate)}).`;
            }
        }

        if (userToCheck.vipPermanentRequests) {
            vipInfo += ` You have ${userToCheck.vipPermanentRequests} non-expiring request(s).`;
        }

        if (userToCheck.vipLastRequest) {
            lastReqInfo = ` Your last request was: ${dateFormatWithWeek.format(new Date(userToCheck.vipLastRequest))}`;
        }

        if (vipInfo) {
            this.twitchService.sendMessage(channel, `${userToCheck.username}, your VIP status: ${vipInfo} ${lastReqInfo}`);
        } else {
            this.twitchService.sendMessage(channel, `${userToCheck.username}, you do not have VIP gold currently. ${lastReqInfo}`);
        }
    }

    public async getDescription(): Promise<string> {
        return `Outputs VIP status information for a user. Usage: !vip [<user>]`;
    }
}

export default VipCommand;
