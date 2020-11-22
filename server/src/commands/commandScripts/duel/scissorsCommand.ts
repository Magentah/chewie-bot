import { IUser } from "../../../models";
import { Weapon } from "../../../models/events/duelEvent";
import WeaponCommand from "./weaponCommand";

export class ScissorsCommand extends WeaponCommand {
    public async execute(channel: string, user: IUser): Promise<void> {
        this.chooseWeapon(channel, user, Weapon.Scissors);
    }
}

export default ScissorsCommand;
