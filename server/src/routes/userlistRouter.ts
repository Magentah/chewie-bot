import * as express from "express";
import { UserLevels } from "../models";
import { UserlistController } from "../controllers";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";

const userListRouter: express.Router = express.Router();
const userlistController: UserlistController = BotContainer.get(UserlistController);

userListRouter.get("/api/userlist", (res, req) => userlistController.getUserlist(res, req));
userListRouter.get("/api/userLevels", (res, req) => userlistController.getUserLevels(res, req));
userListRouter.post("/api/userlist/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => userlistController.addUser(res, req));
userListRouter.post("/api/userlist", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => userlistController.updateUser(res, req));
userListRouter.post("/api/userlist/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => userlistController.removeUser(res, req));

export default userListRouter;
