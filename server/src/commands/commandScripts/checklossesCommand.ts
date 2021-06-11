import { Command } from "../command";
import { ICommandAlias, IUser } from "../../models";
import { BotContainer } from "../../inversify.config";
import PointLogsRepository from "../../database/pointLogsRepository";
import { PointLogType } from "../../models/pointLog";
import { Lang } from "../../lang";

export default class CheckLossesCommand extends Command {
    private pointsLog: PointLogsRepository;

    constructor() {
        super();
        this.pointsLog = BotContainer.get(PointLogsRepository);
    }

    public async executeInternal(channel: string, user: IUser, eventTypeArgument: string): Promise<void> {
        const eventType = eventTypeArgument.toLowerCase();
        const stats = await this.pointsLog.getStats(user, eventType as PointLogType ? eventType as PointLogType : undefined);

        switch (eventType) {
            case PointLogType.Bankheist:
                this.outputGameResults(channel, user, stats, "with bankheists");
                return;
            case PointLogType.Duel:
                this.outputGameResults(channel, user, stats, "in duels");
                return;
            case PointLogType.Arena:
                this.outputGameResults(channel, user, stats, "in the arena");
                return;
            case PointLogType.Give:
                this.outputGiveResults(channel, user, stats);
                return;
            default:
                this.outputResults(channel, user, stats, eventType ? eventType : "all events");
                return;
        }
    }

    private async outputResults(channel: string, user: IUser, stats: any, title: string) {
        const total = stats.won + stats.lost;
        let msg = Lang.get("points.check.neutralstats", user.username, title, stats.won, stats.lost);
        if (stats.won === 0 && stats.lost === 0) {
            msg = Lang.get("points.check.notransaction", user.username);
        } else {
            msg += Lang.get("points.check.total", total);
        }

        this.twitchService.sendMessage(channel, msg);
    }

    private async outputGiveResults(channel: string, user: IUser, stats: any) {
        const total = stats.won + stats.lost;
        let msg = Lang.get("points.check.givestats", user.username, Math.abs(stats.lost), stats.won);
        if (stats.won === 0 && stats.lost === 0) {
            msg = Lang.get("points.check.notransaction", user.username);
        } else if (total > 0) {
            msg += Lang.get("points.check.receiver", total);
        } else if (total < 0) {
            msg +=Lang.get("points.check.giver", total);
        }

        this.twitchService.sendMessage(channel, msg);
    }

    private async outputGameResults(channel: string, user: IUser, stats: any, title: string) {
        const total = stats.won + stats.lost;
        let msg = Lang.get("points.check.gamestats", user.username, stats.won, Math.abs(stats.lost), title);
        if (stats.won === 0 && stats.lost === 0) {
            msg = Lang.get("points.check.nogame", user.username, title);
        } else if (total === 0) {
            msg += Lang.get("points.check.gameneutral");
        } else if (total > 0) {
            msg += Lang.get("points.check.gamewin", total);
        } else if (total < 0) {
            msg += Lang.get("points.check.gameloss", Math.abs(total));
        }

        this.twitchService.sendMessage(channel, msg);
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "checkwins", commandName: "checklosses" }
        ];
    }
}
