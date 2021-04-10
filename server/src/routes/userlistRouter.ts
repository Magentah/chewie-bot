import * as express from "express";
import { UserLevels } from "../models";
import { UserlistController } from "../controllers";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";

const userListRouter: express.Router = express.Router();
const userlistController: UserlistController = BotContainer.get(UserlistController);

userListRouter.get("/api/userlist", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => userlistController.getUserlist(req, res));
userListRouter.get("/api/userLevels", (req, res) => userlistController.getUserLevels(req, res));
userListRouter.post("/api/userlist/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => userlistController.addUser(req, res));
userListRouter.post("/api/userlist/addVip/:username", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster), (req, res) => userlistController.addVipGold(req, res));
userListRouter.post("/api/userlist", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => userlistController.updateUser(req, res));
userListRouter.post("/api/userlist/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => userlistController.removeUser(req, res));

userListRouter.get("/api/userlist/profile/:username", (req, res, next) => APIHelper.checkUserLevelOrSameUser(req, res, next, UserLevels.Moderator, req.params.username), (req, res) => userlistController.getUserProfile(req, res));

export default userListRouter;
