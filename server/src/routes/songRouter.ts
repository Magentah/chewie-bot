import * as express from "express";
import { APIHelper } from "../helpers";
import { UserLevels } from "../models";
import { SongController } from "../controllers";
import { BotContainer } from "../inversify.config";

const songRouter: express.Router = express.Router();
const songController: SongController = BotContainer.get(SongController);

songRouter.get("/api/songs", (req, res) => songController.getSongRequests(req, res));
songRouter.get("/api/playedsongs", (req, res) => songController.getSongHistory(req, res));
songRouter.route("/api/songs/history").get((req, res) => songController.searchRequestHistory(req, res));

songRouter
    .route("/api/songs/user/:username")
    .get((req, res) => songController.getSongsForUser(req, res))
    .post((req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songController.addSongForUser(req, res));

songRouter.post("/api/songs/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songController.removeSong(req, res));
songRouter.post("/api/songs/movetotop", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songController.moveSongToTop(req, res));
songRouter.post("/api/songs/complete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songController.completeSong(req, res));

export default songRouter;
