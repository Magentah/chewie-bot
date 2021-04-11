import * as express from "express";
import { BotContainer } from "../inversify.config";
import SettingsController from "../controllers/settingsController";

const settingsRouter: express.Router = express.Router();
const settingsController: SettingsController = BotContainer.get(SettingsController);

settingsRouter.get("/api/settings/:setting", (res, req) => settingsController.getSetting(res, req));

export default settingsRouter;
