import { Command } from "../../command";
import { IUser } from "../../../models";
import DuelEvent from "../../../events/duelEvent";
import { TwitchService, EventService, UserService } from "../../../services/";
import { EventState } from "../../../models/participationEvent";
import { Logger, LogType } from "../../../logger";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

export default class AcceptCommand extends Command {
    private eventService: EventService;

    constructor() {
        super();
        this.eventService = BotContainer.get(EventService);
    }

    public async executeInternal(channel: string, user: IUser, target: string, wager: string): Promise<void> {
        // Find duel that is aimed at the current user.
        Logger.info(LogType.Command, `Looking for a duel for ${user.username} to accept`);

        const runningDuels = this.eventService.getEvents<DuelEvent>();
        for (const duel of runningDuels) {
            if (
                duel.state === EventState.BoardingCompleted &&
                duel.participants.length > 1 &&
                duel.participants[1].user.username === user.username
            ) {
                this.acceptDuel(duel, user, channel);
                return;
            }
        }

        // Find any open duel otherwise.
        Logger.info(LogType.Command, `No duel for ${user.username} found, looking for any open duel`);

        for (const duel of runningDuels) {
            if (duel.state === EventState.Open && duel.participants.length === 1) {
                this.acceptDuel(duel, user, channel);
                return;
            }
        }

        Logger.info(LogType.Command, `No duel to accept for ${user.username} found`);
    }

    private acceptDuel(duel: DuelEvent, user: IUser, channel: string) {
        const [result, msg] = duel.accept(user);
        if (result) {
            this.twitchService.sendMessage(
                channel,
                Lang.get("duel.accepted", duel.participants[0].user.username, duel.participants[1].user.username)
            );
        } else {
            this.twitchService.sendMessage(channel, msg);
        }
    }
}
