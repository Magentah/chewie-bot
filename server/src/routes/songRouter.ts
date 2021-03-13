import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { SongController } from "../controllers";
import { BotContainer } from "../inversify.config";

const songRouter: express.Router = express.Router();
const songController: SongController = BotContainer.get(SongController);

songRouter.get("/api/songs", (res, req) => songController.getSongRequests(res, req));
songRouter
    .route("/api/songs/user/:username")
    .get((res, req) => songController.getSongsForUser(res, req))
    .post((res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => songController.addSongForUser(res, req));

songRouter.post("/api/songs/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (res, req) => songController.removeSong(res, req));

export default songRouter;
