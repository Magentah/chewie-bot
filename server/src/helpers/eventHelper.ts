import { IUser } from "../models";

export default class EventHelper {
    public static validatePoints(user: IUser, wager: number): [boolean, string] {
        if (!wager || wager <= 0) {
            return [false, `Your wager needs to be more than that, ${user.username}`];
        }
        
        if (!Number.isInteger(wager)) {
            return [false, `Please specify a valid amount, ${user.username}`];
        }

        if (user.points < wager) {
            return [false, `${user.username}, you do not have enough chews to wager that much!`];
        }
        return [true, ""];
    }
}
