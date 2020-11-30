import * as Config from "../config.json";
import Constants from "../constants";
import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import { IUserPrincipal, ProviderType} from "../models/userPrincipal";
import { HttpClient, HttpMethods } from "../helpers/httpClient";
import { AxiosResponse } from "axios";
import { ITwitchProfile, ITwitchSubscription, ITwitchUser } from "../models";

@injectable()
export class TwitchWebService {
    private readonly twitchExecutor: HttpClient = new HttpClient(Constants.TwitchAPIEndpoint);;
    private readonly getUserProfileUrl: string = "users";
    private readonly getModeratorsUrl: string = "moderation/moderators";
    private readonly getSubscribersUrl: string = "subscriptions";

    constructor(@inject(UserService) private userService: UserService){
        this.twitchExecutor.setLogging(true);
    }

    public async fetchUserProfile(user: string | IUserPrincipal): Promise<ITwitchProfile> {
        const ctx: IUserPrincipal = await this.getTwitchUserPrincipal(user);

        const header: any = this.buildHeaderFromUserPrincipal(ctx);
        const execute: Function = this.twitchExecutor.build(header);
        
        return await execute(HttpMethods.GET, this.getUserProfileUrl)
            .then((resp: AxiosResponse) => {
                if (resp.data == null){
                    throw new Error("malformed data");
                }

                const json: any = resp.data.data[0];
                
                let profile: ITwitchProfile  = { 
                    provider: ProviderType.Twitch.toString(),
                    id: json.id,
                    username: json.login,
                    displayName: json.display_name,
                    profileImageUrl: json.profile_image_url,
                    _raw: json,
                    _json: json,
                };
 
                return profile;
            });
    }

    public async fetchBroadcasterProfile(): Promise<ITwitchProfile> {
        return this.fetchUserProfile(Config.twitch.broadcasterName);
    }

    /** 
     *  Fetches the list of moderators if users is empty. 
     *  If users are specified, then a moderator subset will be returned from the list.
     *  Wraps https://dev.twitch.tv/docs/api/reference#get-moderators
     * 
     * @param users (optional) - name of users that wants to validate for moderators
     */
    public async fetchModerators(users?: Array<string | IUserPrincipal>): Promise<Array<ITwitchUser>> {
        const broadcasterCtx: IUserPrincipal = await this.getBroadcasterUserPrincipal();
        const broadcasterProfile: ITwitchProfile = await this.fetchUserProfile(broadcasterCtx);

        let getModeratorsUrl = `${this.getModeratorsUrl}?broadcaster_id=${broadcasterProfile.id}`;

        if (users && users.length > 0){
            const userIds: Array<string> = await Promise.all(users.map(async (user: string | IUserPrincipal) => {
                const userCtx: IUserPrincipal = await this.getTwitchUserPrincipal(user);
                const userProfile: ITwitchProfile = await this.fetchUserProfile(userCtx);
                return userProfile.id;
            }));

            userIds.forEach((userId: string) => {
                getModeratorsUrl += `&user_id=${userId}`;
            });
        }
        
        const header: any = this.buildHeaderFromUserPrincipal(broadcasterCtx);
        const execute: Function = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, getModeratorsUrl)
            .then((resp: AxiosResponse) => {
                if (resp.data == null){
                    throw new Error("malformed data");
                }
                
                const json: any = resp.data;

                const pagination = json.pagination;
                const moderators: Array<ITwitchUser> = json.data;
                
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
    public async fetchSubscribers(users?: Array<string | IUserPrincipal>): Promise<Array<ITwitchSubscription>> {
        const broadcasterCtx: IUserPrincipal = await this.getBroadcasterUserPrincipal();
        const broadcasterProfile: ITwitchProfile = await this.fetchUserProfile(broadcasterCtx);

        let getModeratorsUrl = `${this.getSubscribersUrl}?broadcaster_id=${broadcasterProfile.id}`;

        if (users && users.length > 0){
            const userIds: Array<string> = await Promise.all(users.map(async (user: string | IUserPrincipal) => {
                const userCtx: IUserPrincipal = await this.getTwitchUserPrincipal(user);
                const userProfile: ITwitchProfile = await this.fetchUserProfile(userCtx);
                return userProfile.id;
            }));

            userIds.forEach((userId: string) => {
                getModeratorsUrl += `&user_id=${userId}`;
            });
        }
        
        const header: any = this.buildHeaderFromUserPrincipal(broadcasterCtx);
        const execute: Function = this.twitchExecutor.build(header);

        return await execute(HttpMethods.GET, getModeratorsUrl)
            .then((resp: AxiosResponse) => {
                if (resp.data == null){
                    throw new Error("malformed data");
                }
                
                const json: any = resp.data;
                const pagination: any = json.pagination;
                const subscriptions: Array<ITwitchSubscription> = resp.data.data;

                return subscriptions;
            });

    }

    private buildHeaderFromUserPrincipal(ctx: IUserPrincipal): any {
        if (ctx.accessToken == null) {
            throw new Error(`no access token for ${ctx}`);
        }
        return {
            'Authorization': `Bearer ${ctx.accessToken}`,
            'Client-ID': Config.twitch.clientId
        }
    }

    private async getTwitchUserPrincipal(user: string | IUserPrincipal): Promise<IUserPrincipal>  {
        let ctx: IUserPrincipal;

        if (typeof user === 'string'){
            let username: string = user as string;
            ctx = await this.userService.getUserPrincipal(username, ProviderType.Twitch)
            
        } else {
            ctx = user as IUserPrincipal;
        }

        return ctx
    }

    private async getBroadcasterUserPrincipal(): Promise<IUserPrincipal> {
        return this.userService.getUserPrincipal(Config.twitch.broadcasterName, ProviderType.Twitch);
    }

}

export default TwitchWebService;

