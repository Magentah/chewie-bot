import * as express from "express";
import { UserLevels } from "../models";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";
import RedemptionsController from "../controllers/redemptionsController";

const redemptionlistRouter: express.Router = express.Router();
const redemptionsController: RedemptionsController = BotContainer.get(RedemptionsController);

redemptionlistRouter.get("/api/commandRedemptions", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => redemptionsController.getList(req, res));
redemptionlistRouter.post("/api/commandRedemptions/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => redemptionsController.addRedemption(req, res));
redemptionlistRouter.post("/api/commandRedemptions", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => redemptionsController.updateRedemption(req, res));
redemptionlistRouter.post("/api/commandRedemptions/upload", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => redemptionsController.uploadImage(req, res));
redemptionlistRouter.post("/api/commandRedemptions/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => redemptionsController.removeRedemption(req, res));

export default redemptionlistRouter;
