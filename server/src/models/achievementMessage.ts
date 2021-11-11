import { IUser } from ".";
import { AchievementType } from "./achievement";

export default interface AchievementMessage {
    user: IUser;
    type: AchievementType;
    count?: number;
    seasonalCount?: number;
}
