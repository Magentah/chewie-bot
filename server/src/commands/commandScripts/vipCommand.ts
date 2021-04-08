import { Command } from "../command";
import { IUser } from "../../models";

export class VipCommand extends Command {
    constructor() {
        super();
    }

    public executeInternal(channel: string, user: IUser): void {
        const todayDate = new Date(new Date().toDateString());
        let vipInfo = "";
        let lastReqInfo = "";
        const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
        const dateFormatWithWeek = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short" });

        if (user.vipExpiry) {
            if (new Date(user.vipExpiry) < todayDate) {
                vipInfo += `Expired on: ${dateFormat.format(new Date(user.vipExpiry))}.`;
            } else {
                vipInfo += `Can be used until: ${dateFormat.format(new Date(user.vipExpiry))}.`;
            }
        }

        if (user.vipPermanentRequests) {
            vipInfo += ` You have ${user.vipPermanentRequests} non-expiring request(s).`;
        }

        if (user.vipLastRequest) {
            lastReqInfo = ` Your last request was: ${dateFormatWithWeek.format(new Date(user.vipLastRequest))}`;
        }

        if (vipInfo) {
            this.twitchService.sendMessage(channel, `${user.username}, your VIP status: ${vipInfo} ${lastReqInfo}`);
        } else {
            this.twitchService.sendMessage(channel, `${user.username}, you do not have VIP gold currently. ${lastReqInfo}`);
        }
    }
}

export default VipCommand;
