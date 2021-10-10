import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { SeasonController } from "../controllers";
import { BotContainer } from "../inversify.config";

const seasonRouter: express.Router = express.Router();
const controller: SeasonController = BotContainer.get(SeasonController);

seasonRouter.get("/api/seasons", (res, req) => controller.getSeasons(res, req));

export default seasonRouter;
