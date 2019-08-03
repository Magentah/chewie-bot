export class APIResponseParser {
    public static parse<T>(json: string): T {
        return JSON.parse(json) as T;
    }
}

export default APIResponseParser;
