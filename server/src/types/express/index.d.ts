declare namespace Express {
    interface SessionData {
        cookie: any;
    }

    interface Request {
        rawBody: Buffer;
        account?: any;
    }
    interface User {
        account?: number;
    }
}
