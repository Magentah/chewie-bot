import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import AchievementsController from "../controllers/achievementsController";

const achievementlistRouter: express.Router = express.Router();
const achievementsController: AchievementsController = BotContainer.get(AchievementsController);

achievementlistRouter.get("/api/achievements", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => achievementsController.getList(req, res));
 achievementlistRouter.get("/api/myachievements", (req, res) => achievementsController.getUserAchievements(req, res));
achievementlistRouter.post("/api/achievements/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => achievementsController.addAchievement(req, res));
achievementlistRouter.post("/api/achievements", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => achievementsController.updateAchievement(req, res));
achievementlistRouter.post("/api/achievements/upload", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => achievementsController.uploadImage(req, res));
achievementlistRouter.post("/api/achievements/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => achievementsController.removeAchievement(req, res));

export default achievementlistRouter;
