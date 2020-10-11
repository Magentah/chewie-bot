export default class APIHelper {
    public static error(status: number, message: string) {
        return {
            error: {
                status,
                message,
            },
        };
    }
}
