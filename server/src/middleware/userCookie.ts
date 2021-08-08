import { Request, Response, NextFunction } from "express";
import { IUser } from "../models";
import * as Config from "../config.json";

export default function userCookie(req: Request, res: Response, next: NextFunction) {
    let sessionUser = req.user as IUser;

    if (sessionUser !== undefined) {
        if (sessionUser.username === Config.twitch.broadcasterName) {
            res.cookie("broadcaster_user", "1", { expires: new Date(253402300000000) });
        } else {
            res.cookie("broadcaster_user", "0");
        }
    }

    next();
}
