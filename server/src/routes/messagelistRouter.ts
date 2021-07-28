import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import MessagelistController from "../controllers/messagelistController";

const messagelistRouter: express.Router = express.Router();
const messagelistController: MessagelistController = BotContainer.get(MessagelistController);

messagelistRouter.get("/api/messages", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Admin), (res, req) => messagelistController.getMessagelist(res, req));
messagelistRouter.post("/api/messages/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Admin), (res, req) => messagelistController.addMessage(res, req));
messagelistRouter.post("/api/messages", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Admin), (res, req) => messagelistController.updateMessage(res, req));
messagelistRouter.post("/api/messages/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Admin), (res, req) => messagelistController.removeMessage(res, req));

export default messagelistRouter;
