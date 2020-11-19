import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { DuelEvent, Weapon } from "../../../models/events/duelEvent";
import { EventService } from '../../../services/eventService';
import { EventState } from '../../../models/event';

class WeaponCommand extends Command {
    protected chooseWeapon(channel: string, user: IUser, weapon : Weapon): void {
        // We only accept whispers for the choice of weapon.
        if (channel) {
            return;
        }

        // Find the duel which the current user is participating in.
        const runningDuels = BotContainer.get(EventService).getEvents<DuelEvent>();
        for (let duel of runningDuels) {
            if (duel.state === EventState.BoardingCompleted) {
                if (duel.setWeapon(user, weapon)) {
                    BotContainer.get(TwitchService).sendWhisper(user.username, "Your current weapon is: " + weapon);
                    return;
                }
            }
        }
    }
}

export default WeaponCommand;