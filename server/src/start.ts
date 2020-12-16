import BotServer from "./botServer";
import Logger from "./logger";
import "./lang/index.ts";

process.on("warning", (e) => console.log(e.stack));
process.on("error", (e) => console.log(e.stack));

// tslint:disable-next-line: no-var-requires
require("events").EventEmitter.defaultMaxListeners = 50;

Logger.init();

if (process.argv[2] !== "test") {
    const server = new BotServer();
    server.start(process.env.NODE_ENV === "development" ? 8080 : 8080);
} else {
    // unit testing
}
