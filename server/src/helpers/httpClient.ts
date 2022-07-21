import axios, {AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";
import { Logger, LogType } from "../logger";

export enum HttpMethods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD"
}

export class HttpClient {
    constructor(private baseUrl: string,
                private headers: any = {},
                private refreshTokenFn?: () => void,
                private isLogging = false) {
    }

    public build(headers: any = {},
                 isLogging: boolean = this.isLogging):
                (method: HttpMethods, apiPath: string, body?: any) => Promise<AxiosResponse> {
        let headerData = this.headers;

        if (this.headers) {
            headerData = { ...this.headers, ...headers };
        }

        const client: AxiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: headerData
        });

        if (isLogging) {
            this.logRequest(client);
            this.logResponse(client);
        }

        const execute = (method: HttpMethods, apiPath: string, body?: any) => {
            const future = client.request({
                url: apiPath,
                method,
                data: body
            });

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

    private logResponse(client: AxiosInstance): void {
        client.interceptors.response.use((response: AxiosResponse) => {
            Logger.info(LogType.Http, "======= RESPONSE =======");
            Logger.info(LogType.Http, `${response.config.method} ${response.config.baseURL} ${response.config.url} -- STATUS: ${response.status}`);
            return response;
        }, (error: AxiosError) => {
            const meta = { ...error.config, response: error.response?.data };
            Logger.err(LogType.Http, JSON.stringify(meta));
            return Promise.reject(error);
        });
    }
}
