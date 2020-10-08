import * as express from "express";
import { SongController } from "../controllers";
import { BotContainer } from "../inversify.config";

const songRouter: express.Router = express.Router();
const songController: SongController = BotContainer.get(SongController);

songRouter.get("/api/songs", (res, req) => songController.getSongRequests(res, req));
songRouter
    .route("/api/songs/:username")
    .get((res, req) => songController.getSongsForUser(res, req))
    .post((res, req) => songController.addSongForUser(res, req))
    .delete((res, req) => songController.removeSongForUser(res, req));

songRouter.delete("/api/songs/:songId", (res, req) => songController.removeSong(res, req));

export default songRouter;
