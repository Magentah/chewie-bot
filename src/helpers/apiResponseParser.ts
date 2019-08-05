export class APIResponseParser {
    /**
     * Helper function to parse an API response string in json format to a TS type object.
     * @param json JSON string to parse to object of type T.
     */
    public static parse<T>(json: string): T {
        return JSON.parse(json) as T;
    }
}

export default APIResponseParser;
