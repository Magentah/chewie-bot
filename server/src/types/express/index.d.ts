declare namespace Express {
    interface SessionData {
        cookie: any;
    }

    interface Request {
        rawBody: Buffer;
        account?: any;
        files?: any;
    }
    interface User {
        account?: number;
    }
}
