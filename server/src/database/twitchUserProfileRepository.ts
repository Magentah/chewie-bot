import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import { ITwitchUserProfile } from "../models";
import { DatabaseProvider, DatabaseTables } from "../services";

@injectable()
export default class TwitchUserProfileRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(username: string): Promise<ITwitchUserProfile> {
        const databaseService = await this.databaseProvider();
        Logger.debug(
            LogType.Database,
            databaseService
                .getQueryBuilder(DatabaseTables.TwitchUserProfile)
                .where("twitchUserProfile.username", "like", username)
                .first()
                .toSQL().sql
        );
        const twitchProfile = await databaseService
            .getQueryBuilder(DatabaseTables.TwitchUserProfile)
            .where("twitchUserProfile.username", "like", username)
            .first();
        return twitchProfile as ITwitchUserProfile;
    }

    public async add(twitchProfile: ITwitchUserProfile): Promise<void> {
        const databaseService = await this.databaseProvider();
        if (!(await this.twitchProfileExists(twitchProfile))) {
            Logger.debug(
                LogType.Database,
                databaseService.getQueryBuilder(DatabaseTables.TwitchUserProfile).insert(twitchProfile).toSQL().sql
            );
            await databaseService.getQueryBuilder(DatabaseTables.TwitchUserProfile).insert(twitchProfile);
        }
    }

    public async twitchProfileExists(twitchProfile: ITwitchUserProfile): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (twitchProfile.id && twitchProfile.id > 0) {
            const result = await databaseService
                .getQueryBuilder(DatabaseTables.TwitchUserProfile)
                .first()
                .where({ id: twitchProfile.id });
            if (result) {
                return true;
            }
        } else {
            const result = await databaseService
                .getQueryBuilder(DatabaseTables.TwitchUserProfile)
                .first()
                .where("twitchUserProfile.id", twitchProfile.id);
            if (result) {
                return true;
            }
        }
        return false;
    }
}
