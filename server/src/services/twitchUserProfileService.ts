import { inject, injectable } from "inversify";
import { ITwitchUserProfile } from "../models";
import { TwitchUserProfileRepository } from "../database";

@injectable()
export default class TwitchUserProfileService {
    constructor(@inject(TwitchUserProfileRepository) private twitchUserProfiles: TwitchUserProfileRepository) {
        // Empty
    }

    public async addTwitchUserProfile(userProfile: ITwitchUserProfile): Promise<ITwitchUserProfile> {
        await this.twitchUserProfiles.add(userProfile);
        return await this.getTwitchUserProfile(userProfile.username);
    }

    public async getTwitchUserProfile(username: string): Promise<ITwitchUserProfile> {
        return await this.twitchUserProfiles.get(username);
    }
}
