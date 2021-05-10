import { inject, injectable } from "inversify";
import ChannelPointRewardEventsRepository from "../database/channelPointRewardEventsRepository";
import ChannelPointRewardsRepository, { IDBChannelPointReward } from "../database/channelPointRewardsRepository";
import RewardEventsRepository from "../database/rewardEventsRepository";
import TwitchChannelTaxEventService from "./twitchChannelTaxEventService";
import TwitchWebService from "./twitchWebService";
import { ITwitchChannelReward } from "../models";

export enum RewardEvent {
    Tax = "Tax Reward Event",
}

@injectable()
export default class TwitchChannelPointRewardService {
    constructor(
        @inject(ChannelPointRewardsRepository) private channelPointRewardsRepository: ChannelPointRewardsRepository,
        @inject(ChannelPointRewardEventsRepository) private channelPointRewardEventsRepository: ChannelPointRewardEventsRepository,
        @inject(RewardEventsRepository) private rewardEventsRepository: RewardEventsRepository,
        @inject(TwitchWebService) private twitchWebService: TwitchWebService
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

    public async getChannelRewardsForBroadcaster(): Promise<ITwitchChannelReward[]> {
        const rewards = await this.twitchWebService.getChannelRewards();
        return rewards;
    }

    public async getAllEventAssociations(): Promise<any[]> {
        const associations = await this.channelPointRewardEventsRepository.getAll();
        return associations;
    }
}
