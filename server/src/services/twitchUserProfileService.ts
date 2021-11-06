import { inject, injectable, LazyServiceIdentifer } from "inversify";
import { ITwitchUserProfile } from "../models";
import { TwitchUserProfileRepository } from "../database/twitchUserProfileRepository";

@injectable()
export class TwitchUserProfileService {
    constructor(
        @inject(new LazyServiceIdentifer(() => TwitchUserProfileRepository))
        private twitchUserProfiles: TwitchUserProfileRepository
    ) {
        // Empty
    }

    public async addTwitchUserProfile(userProfile: ITwitchUserProfile): Promise<ITwitchUserProfile> {
        await this.twitchUserProfiles.addOrUpdate(userProfile);
        return await this.getTwitchUserProfile(userProfile.username);
    }

    public async getTwitchUserProfile(username: string): Promise<ITwitchUserProfile> {
        return await this.twitchUserProfiles.get(username);
    }
}

export default TwitchUserProfileService;
