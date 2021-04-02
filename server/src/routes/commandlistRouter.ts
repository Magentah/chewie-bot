import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { CommandlistController } from "../controllers";
import { BotContainer } from "../inversify.config";

const commandlistRouter: express.Router = express.Router();
const commandlistController: CommandlistController = BotContainer.get(CommandlistController);

commandlistRouter.get("/api/commandlist", (res, req) => commandlistController.getCommandlist(res, req));
commandlistRouter.post("/api/commandlist/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => commandlistController.addCommand(res, req));
commandlistRouter.post("/api/commandlist", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => commandlistController.updateCommand(res, req));
commandlistRouter.post("/api/commandlist/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => commandlistController.removeCommand(res, req));

export default commandlistRouter;
