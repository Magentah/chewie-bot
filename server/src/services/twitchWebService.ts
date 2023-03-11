import * as Config from "../config.json";
import Constants from "../constants";
import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import { IUserPrincipal, ProviderType } from "../models/userPrincipal";
import { HttpClient, HttpMethods } from "../helpers/httpClient";
import { AxiosResponse } from "axios";
import { ITwitchUserProfile, ITwitchSubscription, ITwitchUser, ITwitchChannelRewardUpdateRequest, ITwitchChannelReward, ITwitchAddChannelReward } from "../models";
import TwitchAuthService, { ITwitchAuthClientToken, ITwitchAuthUserToken } from "./twitchAuthService";
import { Logger, LogType } from "../logger";
import HttpStatusCodes from "http-status-codes";
import BotSettingsService, { BotSettings } from "./botSettingsService";

interface ITwitchExecutor {
    executeFunction: (method: HttpMethods, apiPath: string, body?: any) => Promise<AxiosResponse>;
}

interface ITwitchUserExecutor extends ITwitchExecutor {
    twitchUserId: number
}

interface IParsedResponse {
    statusCode: number;
    data: any;
}

/**
 * Provides acces to Twitch API endpoints.
 */
@injectable()
export class TwitchWebService {
    private readonly twitchExecutor: HttpClient = new HttpClient(Constants.TwitchAPIEndpoint);
    private readonly getUserProfileUrl: string = "users";
    private readonly getModeratorsUrl: string = "moderation/moderators";
    private readonly getSubscribersUrl: string = "subscriptions";
    private readonly getChannelRedemptionUrl: string = "channel_points/custom_rewards/redemptions";
    private readonly getChannelRewardsUrl: string = "channel_points/custom_rewards";

    constructor(@inject(UserService) private userService: UserService, @inject(TwitchAuthService) private authService: TwitchAuthService,
        @inject(BotSettingsService) private settingsService: BotSettingsService) {
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
        const executor = await this.getClientExecutor();

        return await executor?.executeFunction(HttpMethods.GET, this.getUserProfileUrl + `?login=${user}`).then((resp: AxiosResponse) => {
            if (resp.data === undefined) {
                Logger.err(LogType.Twitch, "Malformed data from fetchUserProfile", resp);
                return undefined;
            }

            if (resp.data.data.length === 0){
                return undefined;
            }

            const json = resp.data.data[0] as { id: string, login: string, display_name: string, profile_image_url: string };

            const profile: ITwitchUserProfile = {
                id: parseInt(json.id, 10),
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
     * Status can be FULFILLED or CANCELED. Should only be used to update UNFULFILLED reward redemptions.
     *
     * @param channelRewardId The id of the channel reward.
     * @param redemptionRewardId The id of the channel reward redemption.
     * @param status The status to set the redemption to. FULFILLED or CANCELED.
     */
    public async updateChannelRewardStatus(channelRewardId: string, redemptionRewardId: string, status: "FULFILLED" | "CANCELED"): Promise<void> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return;
        }

        const body = {
            status
        };
        const updateStatusUrl = `${this.getChannelRedemptionUrl}?broadcaster_id=${executor.twitchUserId}&reward_id=${channelRewardId}&id=${redemptionRewardId}`;
        const response: AxiosResponse = await executor.executeFunction(HttpMethods.PATCH, updateStatusUrl, body);

        const parsedResponse = this.parseResponse("UpdateChannelReward", response);

        Logger.info(LogType.TwitchEvents, "Update Reward AxiosResponse: ", response);
        Logger.info(LogType.TwitchEvents, "Update Reward ParsedResponse: ", parsedResponse);

        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.TwitchEvents, "Failed to get valid response from Twitch API.", {
                url: updateStatusUrl,
                requestBody: body,
                response: parsedResponse,
            });
            return;
        } else {
            Logger.info(LogType.TwitchEvents, `Updated ${redemptionRewardId} status to 'FULFILLED'`);
            return;
        }
    }

    /**
     * Update the status of a Channel Reward Redemption.
     *
     * Status can be FULFILLED or CANCELED. Should only be used to update UNFULFILLED reward redemptions.
     *
     * @param channelRewardId The id of the channel reward.
     * @param redemptionRewardId The id of the channel reward redemption.
     * @param status The status to set the redemption to. FULFILLED or CANCELED.
     */
    public async tryUpdateChannelRewardStatus(channelRewardId: string, redemptionRewardId: string, status: "FULFILLED" | "CANCELED"): Promise<void> {
        try {
            await this.updateChannelRewardStatus(channelRewardId, redemptionRewardId, status);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Failed to update channel reward status.", error);
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

        let channelRewardsUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.twitchUserId}`;

        if (rewardId) {
            channelRewardsUrl += `&id=${rewardId}`;
        }

        if (onlyManageableRewards) {
            channelRewardsUrl += `&only_manageable_rewards=${onlyManageableRewards}`;
        }

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.GET, channelRewardsUrl);
        const parsedResponse = this.parseResponse("GetChannelRewards", response);

        const channelRewards = parsedResponse.data as ITwitchChannelReward[];
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
    public async updateChannelReward(rewardId: string, reward: ITwitchChannelRewardUpdateRequest): Promise<boolean> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return false;
        }

        const updateChannelRewardsUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.twitchUserId}&id=${rewardId}`;

        const result: AxiosResponse = await executor.executeFunction(HttpMethods.PATCH, updateChannelRewardsUrl, reward);
        if (result.status !== HttpStatusCodes.OK) {
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
    public async createChannelReward(reward: ITwitchAddChannelReward): Promise<ITwitchChannelReward | undefined> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return undefined;
        }

        const createChannelRewardUrl = `${this.getChannelRewardsUrl}?broadcaster_id=${executor.twitchUserId}`;

        const response: AxiosResponse = await executor.executeFunction(HttpMethods.POST, createChannelRewardUrl, reward);
        const parsedResponse = this.parseResponse("CreateChannelReward", response);
        if (parsedResponse.statusCode !== HttpStatusCodes.OK) {
            Logger.err(LogType.Twitch, "Failed to create channel reward.");
            return undefined;
        }

        const createdChannelRewards = parsedResponse.data as ITwitchChannelReward[];
        return createdChannelRewards[0];
    }

    /**
     *  Fetches the list of moderators if users is empty.
     *  If users are specified, then a moderator subset will be returned from the list.
     *  Wraps https://dev.twitch.tv/docs/api/reference#get-moderators
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchModerators(users?: (string|number)[]): Promise<ITwitchUser[] | undefined> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return undefined;
        }

        let getModeratorsUrl = `${this.getModeratorsUrl}?broadcaster_id=${executor.twitchUserId}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(
                users.map(async (user: string|number) => {
                    if (typeof(user) === "number") {
                        return user;
                    }

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
            return undefined;
        }

        const moderators = parsedResponse.data as ITwitchUser[];
        return moderators;
    }

    public async isUserModded(username: string|number): Promise<boolean | undefined> {
        const mods = await this.fetchModerators([username]);
        return mods === undefined ? undefined : mods.length > 0;
    }

    public async isUserSubbed(username: string): Promise<boolean | undefined> {
        const subs = await this.fetchSubscribers([username]);
        return subs === undefined ? undefined : subs.length > 0;
    }

    /**
     * Checks if a user name is a valid Twitch user.
     * @param username User name to check
     * @returns true if user exists
     */
    public async userExists(username: string): Promise<boolean> {
        const executor = await this.getClientExecutor();
        if (!executor) {
            return false;
        }

        return await this.getUserId(username, executor) !== undefined;
    }

    /**
     * Determines the follow date for a user (broadcaster's channel).
     * @param username User to check
     * @returns Date time of followage
     */
    public async getFollowInfo(username: string): Promise<string> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return "";
        }

        const userId = await this.getUserId(username, executor);
        if (!userId) {
            return "";
        }

        const { data } = await executor.executeFunction(HttpMethods.GET, `channels/followers?user_id=${userId}&broadcaster_id=${executor.twitchUserId}`);
        if (!data?.data || data.data.length === 0) {
            return "";
        }

        return data.data[0].followed_at;
    }

    /**
     *  Fetches the list of subscribers if users is empty.
     *  If users are specified, a subscriber subset will be returned from the list.
     *  reference - https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchSubscribers(users?: string[]): Promise<ITwitchSubscription[] | undefined> {
        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return undefined;
        }

        let getSubsUrl = `${this.getSubscribersUrl}?broadcaster_id=${executor.twitchUserId}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(
                users.map(async (user: string) => {
                    const userProfile = await this.fetchUserProfile(user);
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
            return undefined;
        }

        const subscriptions= response.data.data as ITwitchSubscription[];
        return subscriptions;
    }

    /**
     * Determines the last streamed category of a Twitch channel.
     * @param channelName Channel to check
     * @returns Streaming category
     */
    public async getLastChannelCategory(channelName: string): Promise<string> {
        const executor = await this.getClientExecutor();
        if (!executor) {
            return "";
        }

        const userId = await this.getUserId(channelName, executor);
        if (!userId) {
            return "";
        }

        const { data } = await executor.executeFunction(HttpMethods.GET, `channels?broadcaster_id=${userId}`);
        if (!data?.data) {
            return "";
        }

        return data.data[0].game_name;
    }

    private async getUserId(username: string, executor: ITwitchExecutor) : Promise<number | undefined> {
        const userData = await executor.executeFunction(HttpMethods.GET, "users?login=" + username);
        if (!userData?.data?.data[0]?.id) {
            return undefined;
        }

        return parseInt(userData?.data?.data[0]?.id, 10);
    }

    /**
     * Sends a whisper message to a specific user.
     * @param toUser Recipient
     * @param message Message to send
     */
    public async sendWhisper(toUser: string, message: string): Promise<void> {
        const botUser = await this.settingsService.getValue(BotSettings.BotUsername);
        if (!botUser) {
            return;
        }

        const executor = await this.getUserExecutor(botUser);
        if (!executor) {
            return;
        }

        const toUserId = await this.getUserId(toUser, executor);
        if (!toUserId) {
            throw new Error(`Whisper recipient ${toUser} not found`);
        }

        await executor.executeFunction(HttpMethods.POST, `whispers?from_user_id=${executor.twitchUserId}&to_user_id=${toUserId}`, { message });
    }

    private async getModEndpoint(endpoint: string, modUser = "", requiredScopes = ""): Promise<{url: string, executor: ITwitchExecutor}> {
        let broadcasterId = 0;
        let executor: ITwitchUserExecutor | undefined;
        let needsBroadcasterAuth = true;
        if (modUser && modUser !== Config.twitch.broadcasterName) {
            try {
                const modExecutor = await this.getUserExecutor(modUser, requiredScopes);
                if (modExecutor) {
                    executor = modExecutor;

                    // Still need to get broadcaster user id
                    const broadcasterCtx = await this.userService.getUserPrincipal(Config.twitch.broadcasterName, ProviderType.Twitch);
                    if (!broadcasterCtx || !broadcasterCtx.foreignUserId) {
                        throw new Error(`Missing auth for user ${Config.twitch.broadcasterName} authorization`);
                    }

                    broadcasterId = broadcasterCtx.foreignUserId;
                    needsBroadcasterAuth = false;
                }
            } catch (err: any) {
                // Mod auth is optional so fall back to broadcaster if unsuccessful
            }
        }

        if (needsBroadcasterAuth) {
            const broadcasterExecutor = await this.getBroadcasterExecutor();
            if (broadcasterExecutor) {
                executor = broadcasterExecutor;
                broadcasterId = broadcasterExecutor.twitchUserId;
            }
        }

        if (!executor) {
            throw new Error("Error in getModEndpoint");
        }

        // Moderator must be the same user as used for authentication.
        return { url: `${endpoint}?broadcaster_id=${broadcasterId}&moderator_id=${executor.twitchUserId}`, executor };
    }

    /**
     * Ban or timeout a user in chat.
     * @param banUser User to ban
     * @param duration Duration of timeout in seconds (or 0 for ban)
     * @param reason Reason for ban
     */
    public async banUser(banUser: string, duration: number | undefined, reason: string, remodAfterRecovery = false): Promise<void> {
        const endpoint = await this.getModEndpoint("moderation/bans");

        const banUserId = await this.getUserId(banUser, endpoint.executor);
        if (!banUserId) {
            throw new Error(`Unknown user \"${banUser}\"`);
        }

        const data = {
            user_id: banUserId,
            duration,
            reason
        };

        const needsRemod = remodAfterRecovery && duration && await this.isUserModded(banUserId);
        await endpoint.executor.executeFunction(HttpMethods.POST, endpoint.url, { data });

        if (needsRemod) {
            setTimeout(() => void this.modUser(banUserId), duration * 1000);
        }
    }

    /**
     * Makes a user mod in the broadcaster's channel.
     * @param userId User to mod
     */
    public async modUser(userId: number): Promise<void> {
        if (!userId) {
            return;
        }

        const executor = await this.getBroadcasterExecutor();
        if (!executor) {
            return;
        }

        await executor.executeFunction(HttpMethods.POST, `moderation/moderators?broadcaster_id=${executor.twitchUserId}&user_id=${userId}`);
    }

    /**
     * Announce a message in chat.
     * @param username User who executes the announcement command
     * @param message Message to display
     * @param color Color for announcement banner
     */
    public async announce(username: string, message: string, color: "blue" | "green" | "orange" | "purple" | "primary" = "primary"): Promise<void> {
        const endpoint = await this.getModEndpoint("chat/announcements", username, Constants.TwitchModScopes);
        await endpoint.executor.executeFunction(HttpMethods.POST, endpoint.url, { message, color });
    }

    /**
     * Gets the list of current chatters in the broadcaster's channel.
     */
    public async getChatters(): Promise<{"user_id": string, "user_login": string, "user_name": string}[]> {
        const endpoint = await this.getModEndpoint("chat/chatters");
        const { data } = await endpoint.executor.executeFunction(HttpMethods.GET, endpoint.url + "&first=1000");
        if (!data?.data) {
            return [];
        }

        return data.data;
    }

    /**
     * Helper function to get an AxiosInstance configured with broadcaster authentication headers.
     *
     * Call the returned executeFunction with the HttpMethod, Request URL and optional Body.
     *
     * @returns Object with the twitch user id and an executeFunction to call to execute the HTTP request.
     */
    private async getUserExecutor(username: string, requiredScope = ""): Promise<ITwitchUserExecutor | undefined> {
        const userCtx = await this.userService.getUserPrincipal(username, ProviderType.Twitch);
        if (userCtx === undefined) {
            Logger.err(LogType.Twitch, "Unable to get create user auth headers. User context is undefined.");
            return;
        }

        // Check for needed scope and don't return auth if insufficient
        if (requiredScope) {
            if (TwitchAuthService.getMissingPermissions(userCtx.scope, requiredScope).length > 0) {
                return;
            }
        }

        const header = await this.getTokenFromUserPrincipal(userCtx);
        if (!header) {
            Logger.err(LogType.Twitch, "Unable to create user authentication headers.");
            return;
        }

        const execute = this.twitchExecutor.build(header);
        return {
            twitchUserId: userCtx.foreignUserId ?? 0,
            executeFunction: execute,
        };
    }

    private async getBroadcasterExecutor(): Promise<ITwitchUserExecutor | undefined> {
        return this.getUserExecutor(Config.twitch.broadcasterName, "");
    }

    private async getClientExecutor(): Promise<ITwitchExecutor | undefined> {
        const header = await this.getTokenFromClientId();
        if (!header) {
            Logger.err(LogType.Twitch, "Unable to create authentication headers for fetchUserProfile");
            return undefined;
        }

        const execute = this.twitchExecutor.build(header);
        return {
            executeFunction: execute,
        };
    }

    private async getTokenFromUserPrincipal(ctx: IUserPrincipal): Promise<ITwitchAuthUserToken | undefined> {
        if (ctx.accessToken === undefined || ctx.accessToken === "") {
            Logger.err(LogType.Twitch, "No access token for user in buildHeaderFromUserPrincipal", ctx);
            return undefined;
        }

        const auth = await this.authService.getUserAccessToken(ctx);
        ctx.accessToken = auth.accessToken.token;
        ctx.refreshToken = auth.refreshToken;
        await this.userService.updateAuth(ctx);
        return auth;
    }

    private async getTokenFromClientId(): Promise<ITwitchAuthClientToken | undefined> {
        if (Config.twitch.clientId === undefined || Config.twitch.clientId === "") {
            Logger.err(LogType.Twitch, "No twitch client id is configured.");
            return undefined;
        }

        return await this.authService.getClientAccessToken();
    }

    /**
     * Parses an AxiosResponse to check for common failures.
     * @param functionName Helper name for logs.
     * @param response The AxiosResponse from an HTTP request.
     * @returns An object with the statusCode of the request, and data returned from the request.
     */
    private parseResponse(functionName: string, response: AxiosResponse): IParsedResponse {
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
