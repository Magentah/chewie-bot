import { IServiceResponse, ResponseStatus } from "../models";

export default class Response {
    public static Success(message?: string, data?: any): IServiceResponse {
        return {
            status: ResponseStatus.Success,
            message,
            data,
        };
    }

    public static Error(message?: string, data?: any): IServiceResponse {
        return {
            status: ResponseStatus.Error,
            message,
            data,
        };
    }
}
