import * as Config from "../config.json";
import Constants from "../constants";
import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import { IUserPrincipal, ProviderType } from "../models/userPrincipal";
import { HttpClient, HttpMethods } from "../helpers/httpClient";
import { AxiosResponse } from "axios";
import { ITwitchUserProfile, ITwitchSubscription, ITwitchUser, IChannelPointReward, ITwitchChannelRewardRequest, ITwitchChannelReward } from "../models";
import TwitchAuthService from "./twitchAuthService";
import { Logger, LogType } from "../logger";
import HttpStatusCodes from "http-status-codes";

interface ITwitchExecutor {
    broadcasterId: number | undefined;
    executeFunction: any;
}

interface IParsedResponse {
    statusCode: number;
    data: any;
}

/**
 * Provides acces to Twitch API endpoint for checking a user's
 * permission and getting the user profile.
 */
@injectable()
export class TwitchWebService {
    private readonly twitchExecutor: HttpClient = new HttpClient(Constants.TwitchAPIEndpoint);
    private readonly getUserProfileUrl: string = "users";
    private readonly getModeratorsUrl: string = "moderation/moderators";
    private readonly getSubscribersUrl: string = "subscriptions";
    private readonly getChannelRedemptionUrl: string = "channel_points/custom_rewards/redemptions";
    private readonly getChannelRewardsUrl: string = "channel_points/custom_rewards";

    constructor(@inject(UserService) private userService: UserService, @inject(TwitchAuthService) private authService: TwitchAuthService) {
        this.twitchExecutor.setLogging(true);
    }

    /**
     * Gets the user profile for a user.
     * https://dev.twitch.tv/docs/api/reference#get-users
     *
     * @param user The login name of the user to get the profile for.
     * @returns The user profile if it exists. Undefined it there is no profile or there is an error.
     */
    public async fetchUserProfile(user: string): Promise<ITwitchUserProfile | undefined> {
        const header: any = await this.buildHeaderFromClientId();
        if (!header) {
            Logger.err(LogType.Twitch, "Unable to create authentication headers for fetchUserProfile");
            return undefined;
        }

        const execute = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, this.getUserProfileUrl + `?login=${user}`).then((resp: AxiosResponse) => {
            if (resp === undefined) {
                Logger.err(LogType.Twitch, `Unable to get the user profile for ${user}`);
                return undefined;
            }

            if (resp.data === undefined) {
                Logger.err(LogType.Twitch, "Malformed data from fetchUserProfile", resp);
                return undefined;
            }

            const json: any = resp.data.data[0];

            const profile: ITwitchUserProfile = {
                id: json.id,
                username: json.login,
                displayName: json.display_name,
                profileImageUrl: json.profile_image_url,
            };

            return profile;
        });
    }

    /**
     * Update the status of a Channel Reward Redemption.
     *
     * Status can be FULFILLED or CANCELLED. Should only be used to update UNFULFILLED reward redemptions.
     *
     * @param channelRewardId The id of the channel reward.
     * @param redemptionRewardId The id of the channel reward redemption.
     * @param status The status to set the redemption to. FULFILLED or CANCELLED.
     */
    public async updateChannelRewardStatus(channelRewardId: string, redemptionRewardId: string, status: "FULFILLED" | "CANCELLED"): Promise<void> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return;
        }

        const body = {
            "status": status,
        };
        const updateStatusUrl = `${this.getChannelRedemptionUrl}?broadcaster_id=${executor.broadcasterId}&reward_id=${channelRewardId}&id=${redemptionRewardId}`;
        const response: AxiosResponse = await executor.executeFunction(HttpMethods.PATCH, updateStatusUrl, body);

        const parsedResponse = this.parseResponse("UpdateChannelReward", response);

        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.TwitchEvents, "Failed to get valid response from Twitch API.", {
                url: updateStatusUrl,
                requestBody: body,
                statusCode: response.status,
                statusText: response.statusText,
                data: response.data,
            });
            return;
        } else {
            Logger.info(LogType.TwitchEvents, `Updated ${redemptionRewardId} status to 'FULFILLED'`);
            return;
        }
    }

    /**
     * Gets a list of all custom channel rewards for a broadcaster.
     * https://dev.twitch.tv/docs/api/reference#get-custom-reward
     *
     * @param rewardId (optional) - ID of the reward to get from twitch.
     * @param onlyManageableRewards (optional) - When set to true, only returns the custom rewards that the calling client_id can manage.
     * @returns List of TwitchChannelRewards.
     */
    public async getChannelRewards(rewardId?: string, onlyManageableRewards?: boolean): Promise<ITwitchChannelReward[]> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return [];
        }

        let channelRewardsUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.broadcasterId}`;

        if (rewardId) {
            channelRewardsUrl += `&id=${rewardId}`;
        }

        if (onlyManageableRewards) {
            channelRewardsUrl += `&only_manageable_rewards=${onlyManageableRewards}`;
        }

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.GET, channelRewardsUrl);
        const parsedResponse = this.parseResponse("GetChannelRewards", response);
        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.Twitch, "Failed to get channel rewards.");
            return [];
        }
        const channelRewards: ITwitchChannelReward[] = parsedResponse.data;
        return channelRewards;
    }

    /**
     * Update a channel reward.
     * https://dev.twitch.tv/docs/api/reference#update-custom-reward
     *
     * @param rewardId The ID of the reward to update.
     * @param reward The updated values for the reward.
     * @returns True if the update succeeded, false if the update failed.
     */
    public async updateChannelReward(rewardId: string, reward: ITwitchChannelRewardRequest): Promise<boolean> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return false;
        }

        const updateChannelRewardsUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.broadcasterId}&id=${rewardId}`;

        const result: AxiosResponse = await executor.executeFunction(HttpMethods.PATCH, updateChannelRewardsUrl, reward);
        if (result.status != HttpStatusCodes.OK) {
            Logger.warn(LogType.Twitch, `Failed to update channel reward ${rewardId}. Error Code: ${result.status}.`);
            return false;
        }

        return true;
    }

    /**
     * Create a new channel reward.
     * https://dev.twitch.tv/docs/api/reference#create-custom-rewards
     *
     * @param reward The reward to create.
     * @returns The created rewards if successful, an empty array if creation failed.
     */
    public async createChannelReward(reward: ITwitchChannelRewardRequest): Promise<ITwitchChannelReward[]> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return [];
        }

        const createChannelRewardUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.broadcasterId}`;

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.POST, createChannelRewardUrl, reward);
        const parsedResponse = this.parseResponse("CreateChannelReward", response);
        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.Twitch, "Failed to create channel reward.");
            return [];
        }

        const createdChannelRewards: ITwitchChannelReward[] = parsedResponse.data;
        return createdChannelRewards;
    }

    /**
     *  Fetches the list of moderators if users is empty.
     *  If users are specified, then a moderator subset will be returned from the list.
     *  Wraps https://dev.twitch.tv/docs/api/reference#get-moderators
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchModerators(users?: string[]): Promise<ITwitchUser[]> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return [] as ITwitchUser[];
        }

        let getModeratorsUrl = `${this.getModeratorsUrl}?broadcaster_id=${executor.broadcasterId}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(
                users.map(async (user: string) => {
                    const userProfile: ITwitchUserProfile | undefined = await this.fetchUserProfile(user);
                    return userProfile?.id ?? 0;
                })
            );

            userIds.forEach((userId: number) => {
                getModeratorsUrl += `&user_id=${userId}`;
            });
        }

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.GET, getModeratorsUrl);

        const parsedResponse = this.parseResponse("FetchModerators", response);
        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.Twitch, "Failed to get moderators list.");
            return [];
        }

        const moderators: ITwitchUser[] = parsedResponse.data;
        return moderators;
    }

    /**
     *  Fetches the list of subscribers if users is empty.
     *  If users are specified, a subscriber subset will be returned from the list.
     *  reference - https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchSubscribers(users?: string[]): Promise<ITwitchSubscription[]> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return [] as ITwitchSubscription[];
        }

        let getSubsUrl = `${this.getSubscribersUrl}?broadcaster_id=${executor.broadcasterId}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(
                users.map(async (user: string) => {
                    const userProfile: ITwitchUserProfile | undefined = await this.fetchUserProfile(user);
                    return userProfile?.id ?? 0;
                })
            );

            userIds.forEach((userId: number) => {
                getSubsUrl += `&user_id=${userId}`;
            });
        }

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.GET, getSubsUrl);
        const parsedResponse = this.parseResponse("FetchSubscribers", response);
        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.Twitch, "Failed to get Subscribers list.");
            return [];
        }

        const subscriptions: ITwitchSubscription[] = response.data.data;
        return subscriptions;
    }

    /**
     * Helper function to get an AxiosInstance configured with broadcaster authentication headers.
     *
     * Call the returned executeFunction with the HttpMethod, Request URL and optional Body.
     *
     * @returns Object with the broadcasterId and an executeFunction to call to execute the HTTP request.
     */
    private async getBroadcasterExecutor(): Promise<ITwitchExecutor | undefined> {
        const broadcasterCtx: IUserPrincipal | undefined = await this.getBroadcasterUserPrincipal();
        if (broadcasterCtx === undefined) {
            Logger.err(LogType.Twitch, "Unable to get create BroadcasterAuthHeaders. Broadcaster context is undefined.");
            return;
        }

        const header: any = await this.buildHeaderFromUserPrincipal(broadcasterCtx);
        if (!header) {
            Logger.err(LogType.Twitch, "Unable to create broadcaster authentication headers.");
            return;
        }

        const execute = this.twitchExecutor.build(header);
        return {
            broadcasterId: broadcasterCtx.userId,
            executeFunction: execute,
        };
    }

    private async buildHeaderFromUserPrincipal(ctx: IUserPrincipal): Promise<any> {
        if (ctx.accessToken === undefined || ctx.accessToken === "") {
            Logger.err(LogType.Twitch, "No access token for user in buildHeaderFromUserPrincipal", ctx);
            return undefined;
        }

        const auth = await this.authService.getUserAccessToken(ctx);

        const user = await this.userService.getUser(ctx.username);
        if (user) {
            user.accessToken = auth.accessToken.token;
            user.refreshToken = auth.refreshToken;
            this.userService.updateUser(user);
        }

        return {
            "Authorization": `Bearer ${auth.accessToken.token}`,
            "Client-ID": auth.clientId,
        };
    }

    private async buildHeaderFromClientId(): Promise<any> {
        if (Config.twitch.clientId === undefined || Config.twitch.clientId === "") {
            Logger.err(LogType.Twitch, "No twitch client id is configured.");
            return undefined;
        }

        const auth = await this.authService.getClientAccessToken();
        return {
            "Authorization": `Bearer ${auth.accessToken.token}`,
            "Client-ID": auth.clientId,
        };
    }

    private async getBroadcasterUserPrincipal(): Promise<IUserPrincipal | undefined> {
        return this.userService.getUserPrincipal(Config.twitch.broadcasterName, ProviderType.Twitch);
    }

    /**
     * Parses an AxiosResponse to check for common failures.
     * @param functionName Helper name for logs.
     * @param response The AxiosResponse from an HTTP request.
     * @returns An object with the statusCode of the request, and data returned from the request.
     */
    private parseResponse(functionName: string, response: AxiosResponse): IParsedResponse {
        if (response === undefined) {
            // Broadcaster has not given full authorization, user list cannot be fetched.
            Logger.warn(LogType.Twitch, `Response was undefined from function call ${functionName}.`);
            return {
                statusCode: 0,
                data: undefined,
            };
        }

        if (response.data === undefined) {
            Logger.err(LogType.Twitch, `Data was malformed in response from function call ${functionName}`);
            return {
                statusCode: 0,
                data: undefined,
            };
        }

        const json: any = response.data;
        if (!json.data) {
            // List empty: return empty array
            return {
                statusCode: response.status,
                data: undefined,
            };
        } else {
            return {
                statusCode: response.status,
                data: json.data,
            };
        }
    }
}

export default TwitchWebService;
