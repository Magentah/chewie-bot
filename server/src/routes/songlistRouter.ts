import * as express from "express";
import { SonglistController } from "../controllers";
import { BotContainer } from "../inversify.config";

const songListRouter: express.Router = express.Router();
const songlistController: SonglistController = BotContainer.get(SonglistController);

songListRouter.get("/api/songlist", (res, req) => songlistController.getSonglist(res, req));
songListRouter.post("/api/songlist/add", (res, req) => songlistController.addSong(res, req));
songListRouter.post("/api/songlist", (res, req) => songlistController.updateSong(res, req));
songListRouter.post("/api/songlist/delete", (res, req) => songlistController.removeSong(res, req));

export default songListRouter;
