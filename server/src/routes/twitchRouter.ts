import * as express from "express";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);

twitchRouter.get("/api/twitch/:channel/join", (res, req) => twitchController.joinChannel(res, req));
twitchRouter.get("/api/twitch/:channel/leave", (res, req) => twitchController.leaveChannel(res, req));
twitchRouter.get("/api/twitch/status", (res, req) => twitchController.getStatus(res, req));
twitchRouter.get("/api/twitch/connect", (res, req) => twitchController.connect(res, req));
twitchRouter.get("/api/twitch/disconnect", (res, req) => twitchController.disconnect(res, req));

export default twitchRouter;
