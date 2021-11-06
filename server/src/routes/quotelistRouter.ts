import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import QuotelistController from "../controllers/quotelistController";

const quotelistRouter: express.Router = express.Router();
const quotelistController: QuotelistController = BotContainer.get(QuotelistController);

quotelistRouter.get("/api/quotes", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => quotelistController.getQuotelist(req, res));
quotelistRouter.post("/api/quotes/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => quotelistController.addQuote(req, res));
quotelistRouter.post("/api/quotes", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => quotelistController.updateQuote(req, res));
quotelistRouter.post("/api/quotes/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => quotelistController.removeQuote(req, res));

export default quotelistRouter;
