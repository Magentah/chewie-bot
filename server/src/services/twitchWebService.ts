import * as Config from "../config.json";
import Constants from "../constants";
import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import { IUserPrincipal, ProviderType} from "../models/userPrincipal";
import { HttpClient, HttpMethods } from "../helpers/httpClient";
import { AxiosResponse } from "axios";
import { ITwitchProfile, ITwitchUser } from "../models";

@injectable()
export class TwitchWebService {
    private readonly twitchExecutor: HttpClient = new HttpClient(Constants.TwitchAPIEndpoint);;
    private readonly getUserProfileUrl: string = "users";
    private readonly getModeratorsUrl: string = "moderation/moderators";

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

    /** Wraps https://dev.twitch.tv/docs/api/reference#get-moderators
     * 
     * @param username 
     */
    public async fetchModerators(user: string | IUserPrincipal): Promise<Array<ITwitchUser>> {
        const ctx: IUserPrincipal = await this.getTwitchUserPrincipal(user);

        const profile: ITwitchProfile = await this.fetchUserProfile(ctx);
        const header: any = this.buildHeaderFromUserPrincipal(ctx);
        let getModeratorsUrl = `${this.getModeratorsUrl}?broadcaster_id=${profile.id}`;

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

}

export default TwitchWebService;

