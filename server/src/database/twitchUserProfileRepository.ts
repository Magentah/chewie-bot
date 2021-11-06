import { inject, injectable } from "inversify";
import { ITwitchUserProfile } from "../models";
import { DatabaseProvider, DatabaseTables } from "../services";

@injectable()
export class TwitchUserProfileRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(username: string): Promise<ITwitchUserProfile> {
        const databaseService = await this.databaseProvider();
        const twitchProfile = await databaseService
            .getQueryBuilder(DatabaseTables.TwitchUserProfile)
            .where("twitchUserProfile.username", "like", username)
            .first();
        return twitchProfile as ITwitchUserProfile;
    }

    public async addOrUpdate(twitchProfile: ITwitchUserProfile): Promise<void> {
        const databaseService = await this.databaseProvider();
        if (!(await this.twitchProfileExists(twitchProfile))) {
            await databaseService.getQueryBuilder(DatabaseTables.TwitchUserProfile).insert(twitchProfile);
        } else {
            // Update profile (needed for user name or display name changes)
            await databaseService.getQueryBuilder(DatabaseTables.TwitchUserProfile).update(twitchProfile).where({id: twitchProfile.id});
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

export default TwitchUserProfileRepository;
