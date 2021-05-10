import { inject, injectable } from "inversify";
import ChannelPointRewardEventsRepository from "../database/channelPointRewardEventsRepository";
import ChannelPointRewardsRepository, { IDBChannelPointReward } from "../database/channelPointRewardsRepository";
import RewardEventsRepository from "../database/rewardEventsRepository";
import TwitchChannelTaxEventService from "./twitchChannelTaxEventService";

export enum RewardEvent {
    Tax = "Tax Reward Event",
}

@injectable()
export default class TwitchChannelPointRewardService {
    constructor(
        @inject(ChannelPointRewardsRepository) private channelPointRewardsRepository: ChannelPointRewardsRepository,
        @inject(ChannelPointRewardEventsRepository) private channelPointRewardEventsRepository: ChannelPointRewardEventsRepository,
        @inject(RewardEventsRepository) private rewardEventsRepository: RewardEventsRepository
    ) {
        // Empty
    }

    public async addEventAssociation(rewardEvent: any, channelPointReward: any): Promise<void> {
        await this.channelPointRewardEventsRepository.addChannelRewardEvent(rewardEvent.id, channelPointReward.id);
    }

    public async getChannelRewardForEvent(event: RewardEvent): Promise<IDBChannelPointReward | undefined> {
        const channelReward = await this.channelPointRewardEventsRepository.getForEvent(event);
        return channelReward as IDBChannelPointReward;
    }
}
