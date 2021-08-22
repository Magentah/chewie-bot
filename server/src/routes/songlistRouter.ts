import * as express from "express";
import { UserLevels } from "../models";
import { SonglistController } from "../controllers";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";

const songListRouter: express.Router = express.Router();
const songlistController: SonglistController = BotContainer.get(SonglistController);

songListRouter.get("/api/songlist", (req, res) => songlistController.getSonglist(req, res));
songListRouter.post("/api/songlist/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.addSong(req, res));
songListRouter.post("/api/songlist", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.updateSong(req, res));
songListRouter.post("/api/songlist/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.removeSong(req, res));
songListRouter.post("/api/songlist/star", (req, res) => songlistController.markFavoriteSong(req, res));
songListRouter.post("/api/songlist/unstar", (req, res) => songlistController.unmarkFavoriteSong(req, res));

songListRouter.get("/api/songlist/categories", (req, res) => songlistController.getSonglistCategories(req, res));
songListRouter.post("/api/songlist/categories/add", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.addCategory(req, res));
songListRouter.post("/api/songlist/categories/update", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.updateCategory(req, res));
songListRouter.post("/api/songlist/categories", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.updateSonglistCategories(req, res));
songListRouter.post("/api/songlist/categories/delete", (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator), (req, res) => songlistController.deleteCategory(req, res));

export default songListRouter;
