import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);

twitchRouter.get("/api/twitch/status", (req, res) => twitchController.getStatus(req, res));
twitchRouter.get(
    "/api/twitch/connect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    (req, res) => twitchController.connect(req, res)
);
twitchRouter.get(
    "/api/twitch/disconnect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    (req, res) => twitchController.disconnect(req, res)
);

twitchRouter.get(
    "/api/twitch/botsettings",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    (req, res) => twitchController.getBotSettings(req, res)
);
twitchRouter.post(
    "/api/twitch/botSettings",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    (req, res) => twitchController.saveBotSettings(req, res)
);

twitchRouter.post("/api/twitch/eventsub/callback", (req, res) => twitchController.eventsubCallback(req, res));
twitchRouter.get("/api/twitch/eventsub/subscriptions", (req, res) => twitchController.getEventSubSubscriptions(req, res));
twitchRouter.delete("/api/twitch/eventsub/subscriptions", (req, res) => {
    if (req.query.all === "true") {
        twitchController.deleteAllSubscriptions(req, res);
    } else {
        twitchController.deleteInactiveSubscriptions(req, res);
    }
});
twitchRouter.post("/api/twitch/eventsub/subscription", (req, res) => twitchController.subscribeEventSub(req, res));
twitchRouter.post("/api/twitch/eventsub/setcallback", (req, res) => twitchController.setEventSubCallbackUrl(req, res));

export default twitchRouter;
