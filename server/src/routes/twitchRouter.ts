import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { TwitchController } from "../controllers";
import { BotContainer } from "../inversify.config";
import { ChannelPointRewardController } from "../controllers";

const twitchRouter: express.Router = express.Router();
const twitchController: TwitchController = BotContainer.get(TwitchController);
const pointRewardController: ChannelPointRewardController = BotContainer.get(ChannelPointRewardController);

twitchRouter.get(
    "/api/twitch/status",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => twitchController.getStatus(req, res));
twitchRouter.get(
    "/api/twitch/connect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => twitchController.connect(req, res)
);
twitchRouter.get(
    "/api/twitch/disconnect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => twitchController.disconnect(req, res)
);

twitchRouter.get(
    "/api/twitch/botsettings",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => twitchController.getBotSettings(req, res)
);
twitchRouter.post(
    "/api/twitch/botSettings",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => twitchController.saveBotSettings(req, res)
);

twitchRouter.post("/api/twitch/eventsub/callback", (req, res) => twitchController.eventsubCallback(req, res));
twitchRouter.get(
    "/api/twitch/eventsub/subscriptions",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => twitchController.getEventSubSubscriptions(req, res)
);
twitchRouter.delete(
    "/api/twitch/eventsub/subscriptions",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => {
        if (req.query.all === "true") {
            twitchController.deleteAllSubscriptions(req, res);
        } else {
            twitchController.deleteInactiveSubscriptions(req, res);
        }
    }
);
twitchRouter.post(
    "/api/twitch/eventsub/subscription",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => twitchController.createEventSubscription(req, res)
);
twitchRouter.post(
    "/api/twitch/eventsub/setcallback",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => twitchController.setEventSubCallbackUrl(req, res)
);

twitchRouter.get(
    "/api/twitch/channelrewards",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => pointRewardController.getChannelRewards(req, res)
);
twitchRouter.post(
    "/api/twitch/channelrewards",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => pointRewardController.addChannelReward(req, res)
);
twitchRouter.get(
    "/api/twitch/channelrewards/redemptions",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (res, req) => pointRewardController.getRedemptions(res, req)
);
twitchRouter.get(
    "/api/twitch/channelrewards/associations",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => pointRewardController.getCurrentAssociations(req, res)
);
twitchRouter.post(
    "/api/twitch/channelrewards/associations",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => pointRewardController.addAssociation(req, res)
);
twitchRouter.delete(
    "/api/twitch/channelrewards/associations",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
    (req, res) => pointRewardController.deleteAssociation(req, res)
);
export default twitchRouter;
