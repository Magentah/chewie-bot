import * as express from "express";
import { BotContainer } from "../inversify.config";
import SettingsController from "../controllers/settingsController";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";

const settingsRouter: express.Router = express.Router();
const settingsController: SettingsController = BotContainer.get(SettingsController);

settingsRouter.get("/api/settings", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => settingsController.getSettings(req, res));
settingsRouter.get("/api/setting/:name", (req, res) => settingsController.getSetting(req, res));
settingsRouter.post("/api/settings", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin),
    (req, res) => settingsController.updateSetting(req, res));

export default settingsRouter;
