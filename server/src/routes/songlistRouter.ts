import * as express from "express";
import { UserLevels } from "../models";
import { SonglistController } from "../controllers";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";

const songListRouter: express.Router = express.Router();
const songlistController: SonglistController = BotContainer.get(SonglistController);

songListRouter.get("/api/songlist", (req, res) => songlistController.getSonglist(req, res));
songListRouter.post("/api/songlist/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.addSong(req, res));
songListRouter.post("/api/songlist", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.updateSong(req, res));
songListRouter.post("/api/songlist/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.removeSong(req, res));

songListRouter.get("/api/songlist/categories", (req, res) => songlistController.getSonglistCategories(req, res));
songListRouter.post("/api/songlist/categories/add", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.addCategory(req, res));
songListRouter.post("/api/songlist/categories/update", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.updateCategory(req, res));
songListRouter.post("/api/songlist/categories", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.updateSonglistCategories(req, res));
songListRouter.post("/api/songlist/categories/delete", (res, req, next) => APIHelper.checkUserLevel(res, req, next, UserLevels.Moderator), (req, res) => songlistController.deleteCategory(req, res));

export default songListRouter;
