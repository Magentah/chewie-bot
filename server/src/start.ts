import BotServer from "./botServer";
import Logger from "./logger";
import "./lang/index.ts";

Logger.init();

if (process.argv[2] !== "test") {
    const server = new BotServer();
    server.start(process.env.NODE_ENV === "development" ? 8080 : 8080);
} else {
    // unit testing
}
