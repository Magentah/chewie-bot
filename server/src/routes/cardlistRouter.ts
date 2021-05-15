import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import CardlistController from "../controllers/cardlistController";

const cardlistRouter: express.Router = express.Router();
const cardlistController: CardlistController = BotContainer.get(CardlistController);

cardlistRouter.get("/api/cards", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => cardlistController.getCardlist(res, req));
cardlistRouter.get("/api/mycards", (res, req, next) => cardlistController.getCardStack(res, req));
cardlistRouter.post("/api/cards/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => cardlistController.addCard(res, req));
cardlistRouter.post("/api/cards", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => cardlistController.updateCard(res, req));
cardlistRouter.post("/api/cards/upload", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => cardlistController.uploadImage(res, req));
cardlistRouter.post("/api/cards/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Broadcaster), (res, req) => cardlistController.removeCard(res, req));

export default cardlistRouter;
