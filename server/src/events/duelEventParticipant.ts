import { IUser } from "../models";
import { EventParticipant } from "../models/eventParticipant";
import { Weapon } from "./duelEvent";

export class DuelEventParticipant extends EventParticipant {
    constructor(user: IUser, wager: number, accepted: boolean) {
        super(user, wager);
        this.accepted = accepted;
    }

    public weapon: Weapon = Weapon.None;
    public accepted: boolean;
}
