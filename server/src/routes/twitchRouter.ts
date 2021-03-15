import * as express from "express";
import * as bodyParser from "body-parser";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";
import * as crypto from "crypto";
import { TwitchMessageSignatureError } from "../errors";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);

twitchRouter.get("/api/twitch/:channel/join", (req, res) => twitchController.joinChannel(req, res));
twitchRouter.get("/api/twitch/:channel/leave", (req, res) => twitchController.leaveChannel(req, res));
twitchRouter.get("/api/twitch/status", (req, res) => twitchController.getStatus(req, res));
twitchRouter.get("/api/twitch/connect", (req, res) => twitchController.connect(req, res));
twitchRouter.get("/api/twitch/disconnect", (req, res) => twitchController.disconnect(req, res));

twitchRouter.get("/api/twitch/botsettings", (req, res) => twitchController.getBotSettings(req, res));
twitchRouter.post("/api/twitch/botSettings", (req, res) => twitchController.saveBotSettings(req, res));

twitchRouter.post("/api/twitch/eventsub/callback", (req, res) => twitchController.eventsubCallback(req, res));
twitchRouter.get("/api/twitch/eventsub/subscriptions", (req, res) =>
    twitchController.getEventSubSubscriptions(req, res)
);
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
