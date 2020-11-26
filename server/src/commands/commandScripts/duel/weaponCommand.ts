import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { DuelEvent, Weapon } from "../../../events/duelEvent";
import { EventService } from "../../../services/eventService";
import { EventState } from "../../../models/event";
import { Logger, LogType } from "../../../logger";
import { Lang } from "../../../lang";

class WeaponCommand extends Command {
    protected chooseWeapon(channel: string, user: IUser, weapon: Weapon): void {
        // We only accept whispers for the choice of weapon.
        if (channel) {
            Logger.info(LogType.Command, `Ignoring weapon choice posted in public chat`);
            return;
        }

        // Find the duel which the current user is participating in.
        const runningDuels = BotContainer.get(EventService).getEvents<DuelEvent>();
        for (const duel of runningDuels) {
            if (duel.state === EventState.BoardingCompleted) {
                if (duel.setWeapon(user, weapon)) {
                    BotContainer.get(TwitchService).sendWhisper(user.username, Lang.get("duel.curentweapon", weapon));
                    return;
                }
            }
        }

        Logger.info(LogType.Command, `Cannot set weapon because no duel is currently in progress.`);
    }
}

export default WeaponCommand;
