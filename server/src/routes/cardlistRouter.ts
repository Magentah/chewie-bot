import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import CardlistController from "../controllers/cardlistController";

const cardlistRouter: express.Router = express.Router();
const cardlistController: CardlistController = BotContainer.get(CardlistController);

cardlistRouter.get("/api/cards", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => cardlistController.getCardlist(req, res));
cardlistRouter.get("/api/mycards", (req, res) => cardlistController.getCardStack(req, res));
cardlistRouter.post("/api/redeemcard", (req, res) => cardlistController.redeemCard(req, res));
cardlistRouter.post("/api/cards/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => cardlistController.addCard(req, res));
cardlistRouter.post("/api/cards", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => cardlistController.updateCard(req, res));
cardlistRouter.post("/api/cards/upload", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => cardlistController.uploadImage(req, res));
cardlistRouter.post("/api/cards/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => cardlistController.removeCard(req, res));

export default cardlistRouter;
