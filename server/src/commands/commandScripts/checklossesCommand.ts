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

        // Display just games by default.
        if (!eventType || eventType.startsWith("game")) {
            const stats = await this.pointsLog.getGameStats(user);
            this.outputGameResults(channel, user, stats, "in any game");
            return;
        }

        let logType: PointLogType | undefined;
        if (Object.values(PointLogType).includes(eventType as PointLogType)) {
            logType = eventType as PointLogType;
        }

        const stats = await this.pointsLog.getStats(user, logType);

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
                this.outputResults(channel, user, stats, logType ? logType : "all events");
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
        let msg = "";
        if (stats.won === 0 && stats.lost === 0) {
            msg = Lang.get("points.check.nogame", user.username, title);
        } else if (total === 0) {
            msg = Lang.get("points.check.gameneutral", user.username);
        } else if (total > 0) {
            msg = Lang.get("points.check.gamewin", user.username, total);
        } else if (total < 0) {
            msg = Lang.get("points.check.gameloss", user.username, Math.abs(total));
        }

        this.twitchService.sendMessage(channel, msg);
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "checkwins", commandName: "checklosses" }
        ];
    }

    public getDescription(): string {
        return `Outputs information for the current user about how many points have been lost/won/total for a specific event type. Usage: !checklosses [<event>]`;
    }
}
