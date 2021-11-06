import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import MessagelistController from "../controllers/messagelistController";

const messagelistRouter: express.Router = express.Router();
const messagelistController: MessagelistController = BotContainer.get(MessagelistController);

messagelistRouter.get("/api/messages", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => messagelistController.getMessagelist(req, res));
messagelistRouter.post("/api/messages/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => messagelistController.addMessage(req, res));
messagelistRouter.post("/api/messages", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => messagelistController.updateMessage(req, res));
messagelistRouter.post("/api/messages/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => messagelistController.removeMessage(req, res));

export default messagelistRouter;
