import { inject, injectable } from "inversify";
import { TwitchWebService } from "./twitchWebService";

@injectable()
export default class TwitchChannelRewardEventService {
    constructor(@inject(TwitchWebService) private twitchWebService: TwitchWebService) {
        // Empty;
    }
}
