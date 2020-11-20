import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { DuelEvent } from "../../../models/events/duelEvent";
import { EventService } from '../../../services/eventService';
import { EventState } from '../../../models/event';
import { Logger, LogType } from '../../../logger';

export class AcceptCommand extends Command {
    public async execute(channel: string, user: IUser, target : string, wager : string): Promise<void> {
        // Find duel that is aimed at the current user.
        Logger.info(LogType.Command, `Looking for a duel for ${user.username} to accept`);

        const runningDuels = BotContainer.get(EventService).getEvents<DuelEvent>();
        for (let duel of runningDuels) {
            if (duel.state === EventState.BoardingCompleted && duel.participants.length > 1 && duel.participants[1].user.username === user.username) {
                this.acceptDuel(duel, user, channel);
                return;
            }
        }

        // Find any open duel otherwise.
        Logger.info(LogType.Command, `No duel for ${user.username} found, looking for any open duel`);

        for (let duel of runningDuels) {
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
            BotContainer.get(TwitchService).sendMessage(channel, `It's time to D-D-D-D-D-D-D-D-Duel! Sir ${duel.participants[0].user.username}, Sir ${duel.participants[1].user.username}, please whisper me your weapon of choice using !rock, !paper, or !scissors`);
        } else {
            BotContainer.get(TwitchService).sendMessage(channel, msg);
        }
    }
}

export default AcceptCommand;