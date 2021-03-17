import * as Config from "../config.json";
import Constants from "../constants";
import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import { IUserPrincipal, ProviderType} from "../models/userPrincipal";
import { HttpClient, HttpMethods } from "../helpers/httpClient";
import { AxiosResponse } from "axios";
import { ITwitchUserProfile, ITwitchSubscription, ITwitchUser } from "../models";

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

    constructor(@inject(UserService) private userService: UserService) {
        this.twitchExecutor.setLogging(true);
    }

    public async fetchUserProfile(user: string): Promise<ITwitchUserProfile> {
        let ctx: IUserPrincipal = await this.getTwitchUserPrincipal(user);

        // User might not have authorised with our bot yet, use broadcaster's
        // authorisation to access API.
        if (!ctx.accessToken) {
            ctx = await this.getBroadcasterUserPrincipal();
        }

        const header: any = this.buildHeaderFromUserPrincipal(ctx);
        const execute = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, this.getUserProfileUrl + `?login=${user}`)
            .then((resp: AxiosResponse) => {
                if (resp.data === undefined) {
                    throw new Error("malformed data");
                }

                const json: any = resp.data.data[0];

                const profile: ITwitchUserProfile  = {
                    id: json.id,
                    username: json.login,
                    displayName: json.display_name,
                    profileImageUrl: json.profile_image_url
                };

                return profile;
            });
    }

    public async fetchBroadcasterProfile(): Promise<ITwitchUserProfile> {
        return this.fetchUserProfile(Config.twitch.broadcasterName);
    }

    /**
     *  Fetches the list of moderators if users is empty.
     *  If users are specified, then a moderator subset will be returned from the list.
     *  Wraps https://dev.twitch.tv/docs/api/reference#get-moderators
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchModerators(users?: string[]): Promise<ITwitchUser[]> {
        const broadcasterCtx: IUserPrincipal = await this.getBroadcasterUserPrincipal();
        const broadcasterProfile: ITwitchUserProfile = await this.fetchUserProfile(broadcasterCtx.username);

        let getModeratorsUrl = `${this.getModeratorsUrl}?broadcaster_id=${broadcasterProfile.id}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(users.map(async (user: string) => {
                const userProfile: ITwitchUserProfile = await this.fetchUserProfile(user);
                return userProfile.id;
            }));

            userIds.forEach((userId: number) => {
                getModeratorsUrl += `&user_id=${userId}`;
            });
        }

        const header: any = this.buildHeaderFromUserPrincipal(broadcasterCtx);
        const execute = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, getModeratorsUrl)
            .then((resp: AxiosResponse) => {
                if (resp.data === undefined) {
                    throw new Error("malformed data");
                }

                const json: any = resp.data;
                if (!json.data) {
                    // List empty: return empty array
                    return [] as ITwitchUser[];
                }
                const moderators: ITwitchUser[] = json.data;
                return moderators;
            });
    }

    /**
     *  Fetches the list of subscribers if users is empty.
     *  If users are specified, a subscriber subset will be returned from the list.
     *  reference - https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
     *
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchSubscribers(users?: string[]): Promise<ITwitchSubscription[]> {
        const broadcasterCtx: IUserPrincipal = await this.getBroadcasterUserPrincipal();
        const broadcasterProfile: ITwitchUserProfile = await this.fetchUserProfile(broadcasterCtx.username);

        let getSubsUrl = `${this.getSubscribersUrl}?broadcaster_id=${broadcasterProfile.id}`;

        if (users && users.length > 0) {
            const userIds: number[] = await Promise.all(users.map(async (user: string) => {
                const userProfile: ITwitchUserProfile = await this.fetchUserProfile(user);
                return userProfile.id;
            }));

            userIds.forEach((userId: number) => {
                getSubsUrl += `&user_id=${userId}`;
            });
        }

        const header: any = this.buildHeaderFromUserPrincipal(broadcasterCtx);
        const execute = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, getSubsUrl)
            .then((resp: AxiosResponse) => {
                if (resp.data === undefined) {
                    throw new Error("malformed data");
                }

                const subscriptions: ITwitchSubscription[] = resp.data.data;
                return subscriptions;
            });

    }

    private buildHeaderFromUserPrincipal(ctx: IUserPrincipal): any {
        if (ctx.accessToken === undefined || ctx.accessToken === "") {
            throw new Error(`no access token for ${ctx}`);
        }
        return {
            "Authorization": `Bearer ${ctx.accessToken}`,
            "Client-ID": Config.twitch.clientId
        };
    }

    private async getTwitchUserPrincipal(user: string | IUserPrincipal): Promise<IUserPrincipal>  {
        let ctx: IUserPrincipal;

        if (typeof user === "string") {
            const username: string = user as string;
            ctx = await this.userService.getUserPrincipal(username, ProviderType.Twitch);
        } else {
            ctx = user as IUserPrincipal;
        }

        return ctx;
    }

    private async getBroadcasterUserPrincipal(): Promise<IUserPrincipal> {
        return this.userService.getUserPrincipal(Config.twitch.broadcasterName, ProviderType.Twitch);
    }
}

export default TwitchWebService;
