export default interface IServiceResponse {
    status: ResponseStatus;
    message?: string;
    data?: any;
}

export enum ResponseStatus {
    Success,
    Error,
}
