import { IUser } from "../../../models";
import { Weapon } from "../../../events/duelEvent";
import WeaponCommand from "./weaponCommand";

export class RockCommand extends WeaponCommand {
    public async execute(channel: string, user: IUser): Promise<void> {
        this.chooseWeapon(channel, user, Weapon.Rock);
    }
}

export default RockCommand;
