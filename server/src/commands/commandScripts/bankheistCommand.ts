import { Command } from "../command";
import { TwitchService } from "../../services";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models";
import { BankheistEvent } from "../../events/bankheistEvent";
import { EventService } from "../../services/eventService";
import { ParticipationEvent, EventState } from "../../models/event";
import { EventParticipant } from "../../models/eventParticipant";

/**
 * Command for starting a bankheist.
 * For further details see bankheistEvent.ts
 */
export class BankheistCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, wager: number): Promise<void> {
        if (!ParticipationEvent.validatePoints(user, channel, wager)) {
            return;
        }

        // Bankheist in progress? Join existing event.
        for (const heistInProgress of BotContainer.get(EventService).getEvents<BankheistEvent>()) {
            if (heistInProgress.state === EventState.Open) {
                if (!heistInProgress.addParticipant(new EventParticipant(user, wager))) {
                    BotContainer.get(TwitchService).sendMessage(
                        channel,
                        user.username + ", you already joined the bank heist!"
                    );
                }
                return;
            }
        }

        const bankheist = new BankheistEvent(user, wager);
        bankheist.sendMessage = (msg) => BotContainer.get(TwitchService).sendMessage(channel, msg);

        function isEvent(event: string | BankheistEvent): event is BankheistEvent {
            return (event as BankheistEvent).state !== undefined;
        }

        const result = BotContainer.get(EventService).startEvent(bankheist, user);
        if (!isEvent(result)) {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export default BankheistCommand;
