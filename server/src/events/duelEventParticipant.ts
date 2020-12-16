import { IUser } from "../models";
import { EventParticipant } from "../models/eventParticipant";
import { DuelWeapon } from "./duelWeapon";

export class DuelEventParticipant extends EventParticipant {
    constructor(user: IUser, wager: number, accepted: boolean) {
        super(user, wager);
        this.accepted = accepted;
    }

    public weapon: DuelWeapon = DuelWeapon.None;
    public accepted: boolean;
}
