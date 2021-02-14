export {};

// Required for production docker image to build, for some reason this isn't found in the connect-redis types and tsc fails without it.
declare global {
    namespace Express {
        interface SessionData {
            cookie: any;
        }
    }
}
