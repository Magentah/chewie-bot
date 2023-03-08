import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import { StatusCodes } from "http-status-codes";
import { ITwitchAuthClientToken } from "../services/twitchAuthService";
import { Logger, LogType } from "../logger";

export enum HttpMethods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD"
}

export interface AuthTokenConfig extends AxiosRequestConfig {
    token: ITwitchAuthClientToken
}

export class HttpClient {
    private isLogging = false;
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public build(token: ITwitchAuthClientToken): (method: HttpMethods, apiPath: string, body?: any) => Promise<AxiosResponse> {
        const headers = {
            "Authorization": `Bearer ${token.accessToken.token}`,
            "Client-ID": token.clientId,
        };

        const client: AxiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers,
        });

        if (this.isLogging) {
            this.logRequest(client);
        }

        this.processResponse(client);

        const execute = (method: HttpMethods, apiPath: string, body?: any) => {
            const config: AuthTokenConfig = {
                url: apiPath,
                method,
                data: body,
                token
            };

            const future = client.request(config);
            return future;
        };

        return execute;
    }

    public setLogging(isLogging: boolean): void {
        this.isLogging = isLogging;
    }

    private logRequest(client: AxiosInstance): void {
        client.interceptors.request.use((config: AxiosRequestConfig) => {
            Logger.info(LogType.Http, "======= REQUEST =======");
            Logger.info(LogType.Http, `${config.method} ${config.baseURL} ${config.url}`);
            Logger.info(LogType.Http, JSON.stringify(config.headers));
            return config;
        }, function (error) {
            return Promise.reject(error);
        });
    }

    private processResponse(client: AxiosInstance): void {
        client.interceptors.response.use((response: AxiosResponse) => {
            return response;
        }, (error: AxiosError) => {
            if (error.response?.status === StatusCodes.UNAUTHORIZED) {
                const config = error.config as AuthTokenConfig;
                if (config) {
                    config.token.invalidate();
                }
            }

            const meta = { ...error.config, response: error.response?.data };
            Logger.err(LogType.Http, JSON.stringify(meta));
            return Promise.reject(error);
        });
    }
}
