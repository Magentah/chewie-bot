import { Command } from "../../command";
import { ICommandAlias, IUser } from "../../../models";
import DuelEvent from "../../../events/duelEvent";
import { DuelWeapon } from "../../../events/duelWeapon";
import { EventService, TwitchService } from "../../../services";
import { EventState } from "../../../models/participationEvent";
import { Logger, LogType } from "../../../logger";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

export default class WeaponCommand extends Command {
    private eventService: EventService;

    constructor() {
        super();
        this.eventService = BotContainer.get(EventService);
    }

    public async executeInternal(channel: string, user: IUser, weapon: string): Promise<void> {
        if (!weapon) {
            return;
        }

        switch (weapon.toLowerCase()) {
            case "rock":
                this.chooseWeapon(channel, user, DuelWeapon.Rock);
                break;

            case "scissors":
                this.chooseWeapon(channel, user, DuelWeapon.Scissors);
                break;

            case "paper":
                this.chooseWeapon(channel, user, DuelWeapon.Paper);
                break;
        }
    }

    protected chooseWeapon(channel: string, user: IUser, weapon: DuelWeapon): void {
        // We only accept whispers for the choice of weapon.
        if (channel) {
            Logger.info(LogType.Command, `Ignoring weapon choice posted in public chat`);
            return;
        }

        // Find the duel which the current user is participating in.
        const runningDuels = this.eventService.getEvents(DuelEvent);
        for (const duel of runningDuels) {
            if (duel.state === EventState.BoardingCompleted) {
                if (duel.setWeapon(user, weapon)) {
                    this.twitchService.sendWhisper(user.username, Lang.get("duel.curentweapon", weapon));
                    return;
                }
            }
        }

        Logger.info(LogType.Command, `Cannot set weapon because no duel is currently in progress.`);
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "rock", commandArguments: DuelWeapon.Rock, commandName: "weapon" },
            { alias: "paper", commandArguments: DuelWeapon.Paper, commandName: "weapon" },
            { alias: "scissors", commandArguments: DuelWeapon.Scissors, commandName: "weapon" },
        ];
    }

    public getDescription(): string {
        return `Select your weapon in a duel. Usage: !rock | !paper | !scissors`;
    }
}
