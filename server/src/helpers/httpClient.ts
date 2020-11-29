import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from "axios";

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
                private refreshTokenFn?: Function,
                private isLogging = false) {

    }

    public build(headers: any = {},
                isLogging: boolean = this.isLogging): 
                (method: HttpMethods, apiPath: string, body?: any) => Promise<AxiosResponse> {
        let _headers = this.headers;
        
        if (this.headers) {
            _headers = { ...this.headers, ...headers };
        }

        const client: AxiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: _headers
        });

        if (isLogging){
            this.logRequest(client);
            this.logResponse(client);
        }

        const execute = (method: HttpMethods, apiPath: string, body?: any) => {
            const future: Promise<AxiosResponse> = client({
                url: apiPath,
                method: method,
                data: body
            });
            
            return future;
        }
        
        return execute;
    }

    public setLogging(isLogging: boolean): void {
        this.isLogging = isLogging;
    }

    private logRequest(client: AxiosInstance): void {
        client.interceptors.request.use((config: AxiosRequestConfig) => {
            console.log("======= REQUEST =======");
            console.log(`${config.method} ${config.baseURL} ${config.url}`);
            console.log(JSON.stringify(config.headers));
            // if (config.data){
            //     console.log(`body:\n${config.data}`);
            // }
            return config;
        })
    }

    private logResponse(client: AxiosInstance): void {
        client.interceptors.response.use((response: AxiosResponse) => {
            console.log("======= RESPONSE =======");
            console.log(`${response.config.method} ${response.config.baseURL} ${response.config.url} -- STATUS: ${response.status}`);
            // if (response.data){
            //     console.log(`response: ${JSON.stringify(response.data)}`);
            // }
            return response;
        }, (error: any) => {
            console.log(JSON.stringify(error));
        })
    }

}

