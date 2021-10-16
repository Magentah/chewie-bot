import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { SeasonController } from "../controllers";
import { BotContainer } from "../inversify.config";

const seasonRouter: express.Router = express.Router();
const controller: SeasonController = BotContainer.get(SeasonController);

seasonRouter.get("/api/seasons", (req, res) => controller.getSeasons(req, res));
seasonRouter.post("/api/seasons/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Admin), (req, res) => controller.addSeason(req, res));

export default seasonRouter;
