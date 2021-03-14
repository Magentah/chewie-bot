import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);

twitchRouter.get("/api/twitch/:channel/join", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.joinChannel(res, req));
twitchRouter.get("/api/twitch/:channel/leave", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.leaveChannel(res, req));
twitchRouter.get("/api/twitch/status", (res, req) => twitchController.getStatus(res, req));
twitchRouter.get("/api/twitch/connect", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.connect(res, req));
twitchRouter.get("/api/twitch/disconnect", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.disconnect(res, req));

twitchRouter.get("/api/twitch/botsettings", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.getBotSettings(res, req));
twitchRouter.post("/api/twitch/botSettings", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => twitchController.saveBotSettings(res, req));

twitchRouter.post("/api/twitch/eventsub/callback", (res, req) => twitchController.eventsubCallback(res, req));
twitchRouter.get("/api/twitch/eventsub/subscriptions", (res, req) =>
    twitchController.getEventSubSubscriptions(res, req)
);
twitchRouter.post("/api/twitch/eventsub/subscription", (res, req) => twitchController.subscribeEventSub(res, req));

export default twitchRouter;
