import * as express from "express";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);

twitchRouter.get("/api/twitch/:channel/join", (res, req) => twitchController.joinChannel(res, req));
twitchRouter.get("/api/twitch/:channel/leave", (res, req) => twitchController.leaveChannel(res, req));
twitchRouter.post("/api/twitch/:channel/create", (res, req) => twitchController.createClient(res, req));

export default twitchRouter;
